import * as FileSystem from 'expo-file-system/legacy'

/**
 * Transcribe audio file to text using OpenAI Whisper API
 * Uses direct fetch with FormData since React Native doesn't support File API
 */
export const transcribeAudio = async (audioUri: string): Promise<string | null> => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY

  if (!apiKey) {
    console.error('OpenAI API key not found in environment variables')
    return null
  }

  try {
    // Create FormData for file upload
    const formData = new FormData()

    // Add file to FormData (React Native handles this specially)
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any)

    formData.append('model', 'whisper-1')
    formData.append('language', 'en')

    // Call OpenAI Whisper API directly with fetch
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // Don't set Content-Type - let FormData set it with boundary
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Whisper API error:', response.status, errorText)
      return null
    }

    const result = await response.json()
    return result.text || null
  } catch (error) {
    console.error('Failed to transcribe audio:', error)
    return null
  }
}

/**
 * Alternative: Transcribe using Google Cloud Speech-to-Text
 * You'll need to add EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY to your .env file
 */
export const transcribeAudioWithGoogle = async (audioUri: string): Promise<string | null> => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY

  if (!apiKey) {
    console.error('Google Cloud API key not found in environment variables')
    return null
  }

  try {
    // Read audio file as base64
    const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
      encoding: 'base64',
    })

    // Call Google Cloud Speech-to-Text API
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'MP3',
            sampleRateHertz: 44100,
            languageCode: 'en-US',
          },
          audio: {
            content: base64Audio,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Google transcription error:', error)
      return null
    }

    const result = await response.json()
    const transcript = result.results
      ?.map((r: any) => r.alternatives?.[0]?.transcript)
      .join(' ')

    return transcript || null
  } catch (error) {
    console.error('Failed to transcribe with Google:', error)
    return null
  }
}

/**
 * Fallback: Save placeholder text for voice notes without transcription
 */
export const getVoiceNotePlaceholder = (): string => {
  return '[Voice recording - Transcription pending]'
}
