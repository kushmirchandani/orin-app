import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Subtask {
  text: string
  order: number
}

interface Thought {
  thought_text: string
  type: 'task' | 'idea' | 'reminder' | 'reflection' | 'question' | 'event'
  importance: 'high' | 'medium' | 'low'
  deadline: string | null
  time_needed_minutes: number | null
  category: string
  next_action: string | null
  related: string[]
  resurface_timing: string
  sentiment: string
  subtasks: Subtask[] | null
}

interface AnalyzedContent {
  summary: string
  priorities: string[]
  insights: string
  thoughts: Thought[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse Twilio webhook data (form-urlencoded)
    const formData = await req.formData()
    const messageBody = formData.get('Body')?.toString() || ''
    const fromNumber = formData.get('From')?.toString() || ''
    const toNumber = formData.get('To')?.toString() || ''
    const messageSid = formData.get('MessageSid')?.toString() || ''

    console.log('Received SMS:', { fromNumber, messageBody })

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, sms_enabled')
      .eq('phone_number', fromNumber)
      .single()

    if (profileError || !profile) {
      console.error('User not found for phone:', fromNumber)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we could not find your account. Please make sure you\'re texting from the number you registered with.</Message></Response>',
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      )
    }

    if (!profile.sms_enabled) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>SMS is not enabled for your account. Please enable it in the app settings.</Message></Response>',
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      )
    }

    // Save incoming message
    await supabase.from('sms_conversations').insert({
      user_id: profile.id,
      direction: 'inbound',
      message_body: messageBody,
      from_number: fromNumber,
      to_number: toNumber,
      twilio_message_sid: messageSid,
      status: 'received',
      processed: false,
    })

    // Check if this is a question about past thoughts (Ask the Brain)
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })
    const isQuestion = messageBody.toLowerCase().match(/who|what|when|where|why|how|analyze|tell me|remind me|find|show me|did I|have I|am I supposed to/i)

    if (isQuestion) {
      console.log('Detected question - searching brain')

      // Fetch all user's thoughts
      const { data: allThoughts } = await supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100)

      // Create context from thoughts
      const thoughtsContext = (allThoughts || []).map(t =>
        `[${t.type}] ${t.thought_text}${t.deadline ? ` (due: ${t.deadline})` : ''}${t.category ? ` [${t.category}]` : ''}`
      ).join('\n')

      // Ask OpenAI to answer based on thoughts
      const brainPrompt = `You are Orin, the user's AI thought companion. The user is asking you a question about their thoughts, tasks, or mental state.

USER QUESTION: "${messageBody}"

THEIR THOUGHTS/TASKS/NOTES:
${thoughtsContext}

INSTRUCTIONS:
- Answer their question based on the thoughts above
- Be concise (1-2 sentences max for SMS)
- Be helpful and friendly
- If you can't find relevant info, say so briefly
- For "who am I supposed to call/meet" questions, look for tasks/events with people's names
- For "analyze" questions, look for patterns in their thoughts
- Use a warm, supportive tone

Answer:`

      const brainCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: brainPrompt }],
        temperature: 0.7,
        max_tokens: 200,
      })

      const brainAnswer = brainCompletion.choices[0]?.message?.content || "I couldn't find anything relevant in your thoughts."

      // Send reply
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
          To: fromNumber,
          From: twilioPhoneNumber!,
          Body: brainAnswer,
        }),
      })

      if (twilioResponse.ok) {
        const twilioData = await twilioResponse.json()
        await supabase.from('sms_conversations').insert({
          user_id: profile.id,
          direction: 'outbound',
          message_body: brainAnswer,
          from_number: twilioPhoneNumber!,
          to_number: fromNumber,
          twilio_message_sid: twilioData.sid,
          status: 'sent',
          processed: true,
        })
      }

      // Mark incoming as processed
      await supabase
        .from('sms_conversations')
        .update({ processed: true })
        .eq('twilio_message_sid', messageSid)

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      )
    }

    // Otherwise, process as a thought dump
    // Analyze the message with OpenAI
    const currentDate = new Date().toISOString()

    const systemPrompt = `You are a Thought Architect. Transform one raw mind dump into many structured thought objects.
Extract *every distinct thought*, classify it, add metadata for prioritization and resurfacing.
Always return strict JSON. Do not include commentary.`

    const userPrompt = `CURRENT DATE/TIME: ${currentDate}
USER TIMEZONE: America/New_York

RAW_DUMP:
"${messageBody}"

INSTRUCTIONS:
- Split into distinct items; do not merge unrelated thoughts.
- Identify type: one of ["task","idea","reminder","reflection","question","event"].

  TYPE CLASSIFICATION RULES:
  * "reminder" - Should be classified as "task" (reminders are actionable items to show in task list)
  * "reflection" - Thoughts about past experiences, memories, or introspection (show as notes)
  * "event" - For PAST events or experiences → classify as "reflection" (show as notes)
  * "event" - For FUTURE events or plans (e.g., "I need to go", "I'm going to") → classify as "task" (show in task list)
  * "task" - Actionable items, things to do, plans, or intentions
  * "idea" - Creative thoughts, suggestions, or concepts to explore later
  * "question" - Queries or things the user is wondering about

- Infer importance: "high"|"medium"|"low" from urgency/emotion/impact.
- Parse deadlines (understand relative dates like "Tuesday", "next week") and return ISO 8601 in America/New_York if possible; else null.
- Estimate time_needed in minutes if hinted; else null.
- Assign a lightweight category (free text).
- Provide next_action if actionable; else null.
- Suggest resurface_timing as a *specific time expression* (e.g., "2025-10-06T09:00:00Z") or a relative phrase the server can normalize ("tomorrow morning", "2 days before deadline at 9am").
- Give sentiment (one word).
- List related thought indices (0-based) if thoughts connect.
- Also return global summary, top 3 priorities, and a one-line insight.

SUBTASK GENERATION (CRITICAL):
- For TASKS that are large, vague, or overwhelming (e.g., "plan wedding", "write research paper", "organize garage"), generate subtasks.
- Only generate subtasks for tasks that genuinely benefit from breaking down - NOT for simple, single-action items like "call mom" or "buy milk".
- The FIRST subtask should be extremely small and easy to complete (e.g., "Open Google Docs", "Create a folder", "Find notebook") to help overcome inertia.
- Each subtask should be a concrete, actionable micro-step.
- Order subtasks logically (first subtask is always the easiest starting point).
- Include 3-7 subtasks for large tasks.
- Set subtasks to null for simple tasks.

EXAMPLES OF WHEN TO GENERATE SUBTASKS:
✓ "Plan my sister's wedding" → Break down (large, multi-step project)
✓ "Write quarterly report" → Break down (complex, intimidating)
✓ "Organize home office" → Break down (vague, overwhelming)
✗ "Email John about meeting" → No subtasks (simple, single action)
✗ "Buy groceries" → No subtasks (straightforward task)
✗ "Call dentist to schedule appointment" → No subtasks (one clear action)

RETURN JSON (no extra keys):
{
  "summary": "",
  "priorities": ["", "", ""],
  "insights": "",
  "thoughts": [
    {
      "thought_text": "",
      "type": "",
      "importance": "",
      "deadline": "YYYY-MM-DDTHH:MM:SSZ" | null,
      "time_needed_minutes": 30 | null,
      "category": "",
      "next_action": "" | null,
      "related": [],
      "resurface_timing": "",
      "sentiment": "",
      "subtasks": [{"text": "Very small first step", "order": 1}, {"text": "Next step", "order": 2}] | null
    }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    const analyzed = JSON.parse(content) as AnalyzedContent

    // Save thoughts to database
    for (const thought of analyzed.thoughts) {
      const { data: insertedThought, error } = await supabase
        .from('thoughts')
        .insert({
          user_id: profile.id,
          thought_text: thought.thought_text,
          type: thought.type,
          importance: thought.importance,
          deadline: thought.deadline,
          time_needed_minutes: thought.time_needed_minutes,
          category: thought.category,
          next_action: thought.next_action,
          sentiment: thought.sentiment,
          status: 'open',
          source: 'sms',
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting thought:', error)
        continue
      }

      // Save subtasks if they exist
      if (thought.subtasks && thought.subtasks.length > 0) {
        for (const subtask of thought.subtasks) {
          try {
            const { data: subtaskThought, error: subtaskError } = await supabase
              .from('thoughts')
              .insert({
                user_id: profile.id,
                thought_text: subtask.text,
                type: 'task',
                importance: thought.importance,
                deadline: thought.deadline,
                category: thought.category,
                sentiment: 'neutral',
                status: 'open',
                source: 'sms',
              })
              .select()
              .single()

            if (!subtaskError && subtaskThought) {
              await supabase.from('thought_relations').insert({
                parent_thought_id: insertedThought.id,
                child_thought_id: subtaskThought.id,
                relation: 'subtask',
              })
            }
          } catch (error) {
            console.error('Error creating subtask:', error)
          }
        }
      }
    }

    // Mark as processed
    await supabase
      .from('sms_conversations')
      .update({ processed: true })
      .eq('twilio_message_sid', messageSid)

    // Send confirmation reply
    const taskCount = analyzed.thoughts.filter(t => t.type === 'task' || t.type === 'reminder').length
    const noteCount = analyzed.thoughts.filter(t => ['reflection', 'idea', 'question'].includes(t.type)).length

    let replyMessage = `Got it! I've captured `
    if (taskCount > 0) replyMessage += `${taskCount} task${taskCount > 1 ? 's' : ''}`
    if (taskCount > 0 && noteCount > 0) replyMessage += ` and `
    if (noteCount > 0) replyMessage += `${noteCount} note${noteCount > 1 ? 's' : ''}`
    replyMessage += ` for you. 💙`

    // Send reply via Twilio
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
        To: fromNumber,
        From: twilioPhoneNumber!,
        Body: replyMessage,
      }),
    })

    if (twilioResponse.ok) {
      const twilioData = await twilioResponse.json()

      // Log outbound message
      await supabase.from('sms_conversations').insert({
        user_id: profile.id,
        direction: 'outbound',
        message_body: replyMessage,
        from_number: twilioPhoneNumber!,
        to_number: fromNumber,
        twilio_message_sid: twilioData.sid,
        status: 'sent',
        processed: true,
      })
    }

    // Return empty TwiML response (we already sent a reply)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      }
    )

  } catch (error) {
    console.error('Error processing SMS:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong processing your message. Please try again.</Message></Response>',
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      }
    )
  }
})
