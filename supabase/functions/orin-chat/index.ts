import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { question, thoughtsContext } = await req.json()

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: question' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

    // Create the prompt for OpenAI
    const systemPrompt = `You are Orin, the user's AI thought companion. You help them understand their thoughts, tasks, and notes.

You have access to their recent thoughts below. Use this context to answer their questions accurately and helpfully.

Be concise, friendly, and natural - like talking to a close friend who knows you well. Use a warm, supportive, conversational tone. When referencing specific thoughts, be specific about what you found.

IMPORTANT COMMUNICATION STYLE:
- Speak naturally and human - avoid robotic phrases like "due October 8th" or formal language
- Use casual, conversational language like "your mom's birthday is coming up on October 8th" instead of "wish mom birthday...due October 8th"
- When talking about tasks with deadlines, use natural phrasing: "on the 8th" or "this Tuesday" instead of "due: [date]"
- Don't just list raw data - synthesize it into natural, helpful responses
- Never say "I don't know" or "I don't have enough information"
- If you found relevant thoughts, share insights in a natural, conversational way
- If no directly relevant thoughts exist, make intelligent observations based on patterns you see
- Always provide something helpful and actionable

IMPORTANT - KEEP IT SHORT:
- Keep responses brief - 2-3 sentences max
- If there's a lot to share, give a quick summary and ask "Want me to go deeper on any of these?"
- Never write multi-paragraph responses - users can ask follow-up questions if they want more details
- Think of it like texting a friend - short, punchy, conversational

USER'S RECENT THOUGHTS:
${thoughtsContext || 'No thoughts available yet.'}
`

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const answer = data.choices[0]?.message?.content || "I'm having trouble processing that right now."

    return new Response(
      JSON.stringify({ answer }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in orin-chat function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
