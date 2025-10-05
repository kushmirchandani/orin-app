import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { userId, message } = await req.json()

    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number, sms_enabled')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.sms_enabled || !profile.phone_number) {
      return new Response(
        JSON.stringify({ error: 'SMS not enabled for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        To: profile.phone_number,
        From: twilioPhoneNumber!,
        Body: message,
      }),
    })

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text()
      console.error('Twilio error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const twilioData = await twilioResponse.json()

    // Log the sent message
    await supabase.from('sms_conversations').insert({
      user_id: userId,
      direction: 'outbound',
      message_body: message,
      from_number: twilioPhoneNumber!,
      to_number: profile.phone_number,
      twilio_message_sid: twilioData.sid,
      status: 'sent',
      processed: true,
    })

    return new Response(
      JSON.stringify({ success: true, messageSid: twilioData.sid }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending SMS:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
