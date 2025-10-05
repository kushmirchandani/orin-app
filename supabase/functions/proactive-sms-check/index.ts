import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Get all users with SMS enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, name, phone_number, user_memory')
      .eq('sms_enabled', true)
      .not('phone_number', 'is', null)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Checking ${users?.length || 0} users for proactive SMS`)

    const results = []

    for (const user of users || []) {
      try {
        // Get tasks due soon or high priority
        const { data: tasks, error: tasksError } = await supabase
          .from('thoughts')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'open')
          .in('type', ['task', 'reminder'])
          .or(`importance.eq.high,deadline.lte.${tomorrow.toISOString()}`)
          .limit(5)

        if (tasksError) {
          console.error(`Error fetching tasks for user ${user.id}:`, tasksError)
          continue
        }

        // Skip if no tasks to remind about
        if (!tasks || tasks.length === 0) {
          console.log(`No urgent tasks for user ${user.id}`)
          continue
        }

        // Use AI to craft a personalized reminder message
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

        const tasksSummary = tasks.map(t => {
          let str = `- ${t.next_action || t.thought_text}`
          if (t.deadline) str += ` (due ${new Date(t.deadline).toLocaleDateString()})`
          if (t.importance === 'high') str += ' [HIGH PRIORITY]'
          return str
        }).join('\n')

        const systemPrompt = `You are Orin, a thoughtful AI assistant helping users stay on top of their tasks.
Generate a brief, friendly SMS reminder (max 160 characters) that feels personal and encouraging.
Use the user's name if provided. Keep it casual and supportive.`

        const userPrompt = `USER NAME: ${user.name || 'there'}
USER CONTEXT: ${user.user_memory || 'None'}

UPCOMING TASKS:
${tasksSummary}

Generate a short, friendly SMS reminder message (max 160 chars).`

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 100,
        })

        const message = completion.choices[0]?.message?.content?.trim() ||
          `Hey ${user.name || 'there'}! You have ${tasks.length} task${tasks.length > 1 ? 's' : ''} coming up. Check your Orin app when you can! 💙`

        // Send SMS via Twilio
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
        const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: user.phone_number!,
            From: twilioPhoneNumber!,
            Body: message,
          }),
        })

        if (twilioResponse.ok) {
          const twilioData = await twilioResponse.json()

          // Log the sent message
          await supabase.from('sms_conversations').insert({
            user_id: user.id,
            direction: 'outbound',
            message_body: message,
            from_number: twilioPhoneNumber!,
            to_number: user.phone_number!,
            twilio_message_sid: twilioData.sid,
            status: 'sent',
            processed: true,
          })

          results.push({ userId: user.id, success: true, taskCount: tasks.length })
          console.log(`Sent reminder to user ${user.id}`)
        } else {
          const errorData = await twilioResponse.text()
          console.error(`Failed to send to user ${user.id}:`, errorData)
          results.push({ userId: user.id, success: false, error: errorData })
        }

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        results.push({ userId: user.id, success: false, error: userError.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        usersChecked: users?.length || 0,
        messagesSent: results.filter(r => r.success).length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in proactive SMS check:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
