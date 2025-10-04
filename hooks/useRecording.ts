import { useState, useRef } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '../lib/supabase'

export const useRecording = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
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
      setIsPaused(false)
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

  const pauseRecording = async () => {
    if (!recording || !isRecording) return

    try {
      await recording.pauseAsync()
      setIsPaused(true)

      // Stop duration counter
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
        durationInterval.current = null
      }

      console.log('Recording paused')
    } catch (error) {
      console.error('Failed to pause recording:', error)
    }
  }

  const resumeRecording = async () => {
    if (!recording || !isPaused) return

    try {
      await recording.startAsync()
      setIsPaused(false)

      // Resume duration counter
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      console.log('Recording resumed')
    } catch (error) {
      console.error('Failed to resume recording:', error)
    }
  }

  const stopRecording = async () => {
    if (!recording) return null

    try {
      setIsRecording(false)
      setIsPaused(false)
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

  const restartRecording = async () => {
    // Stop current recording without saving
    if (recording) {
      try {
        if (durationInterval.current) {
          clearInterval(durationInterval.current)
          durationInterval.current = null
        }
        await recording.stopAndUnloadAsync()
      } catch (error) {
        console.error('Failed to stop recording:', error)
      }
    }

    // Reset state
    setRecording(null)
    setRecordingDuration(0)
    setIsPaused(false)
    setIsRecording(false)

    // Wait a bit for cleanup, then start fresh recording
    setTimeout(async () => {
      await startRecording()
    }, 100)
  }

  const cancelRecording = async () => {
    if (!recording) return

    try {
      setIsRecording(false)
      setIsPaused(false)
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
        durationInterval.current = null
      }

      await recording.stopAndUnloadAsync()
      setRecording(null)
      setRecordingDuration(0)

      console.log('Recording cancelled')
    } catch (error) {
      console.error('Failed to cancel recording:', error)
    }
  }

  const uploadRecording = async (uri: string | null, userId: string): Promise<string | null> => {
    if (!uri) return null

    try {
      const fileName = `${userId}/${Date.now()}.m4a`

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      })

      // Decode base64 to binary using React Native's atob
      const decode = (str: string) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
        let output = ''

        str = str.replace(/=+$/, '')

        for (let i = 0; i < str.length;) {
          const enc1 = chars.indexOf(str.charAt(i++))
          const enc2 = chars.indexOf(str.charAt(i++))
          const enc3 = chars.indexOf(str.charAt(i++))
          const enc4 = chars.indexOf(str.charAt(i++))

          const chr1 = (enc1 << 2) | (enc2 >> 4)
          const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
          const chr3 = ((enc3 & 3) << 6) | enc4

          output += String.fromCharCode(chr1)
          if (enc3 !== 64) output += String.fromCharCode(chr2)
          if (enc4 !== 64) output += String.fromCharCode(chr3)
        }

        return output
      }

      const binaryString = decode(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, bytes.buffer, {
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return {
    isRecording,
    isPaused,
    recordingDuration,
    formatDuration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    restartRecording,
    cancelRecording,
    uploadRecording,
  }
}
