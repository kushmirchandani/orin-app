import { useState, useRef } from 'react'
import { Audio } from 'expo-av'
import { supabase } from '../lib/supabase'

export const useRecording = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync()
      if (!permission.granted) {
        alert('Permission to access microphone is required!')
        return
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      setRecording(newRecording)
      setIsRecording(true)
      setRecordingDuration(0)

      // Update duration every second
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      console.log('Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Failed to start recording')
    }
  }

  const stopRecording = async () => {
    if (!recording) return null

    try {
      setIsRecording(false)
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
        durationInterval.current = null
      }

      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      setRecording(null)
      setRecordingDuration(0)

      console.log('Recording stopped, URI:', uri)
      return uri
    } catch (error) {
      console.error('Failed to stop recording:', error)
      return null
    }
  }

  const uploadRecording = async (uri: string | null, userId: string): Promise<string | null> => {
    if (!uri) return null

    try {
      // Read file as blob
      const response = await fetch(uri)
      const blob = await response.blob()
      const fileName = `${userId}/${Date.now()}.m4a`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, blob, {
          contentType: 'audio/m4a',
        })

      if (error) {
        console.error('Upload error:', error)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Failed to upload recording:', error)
      return null
    }
  }

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    uploadRecording,
  }
}
