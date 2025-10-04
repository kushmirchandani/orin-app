import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import DumpsScreen from './DumpsScreen'
import AccountScreen from './AccountScreen'
import { useRecording } from '../hooks/useRecording'
import { supabase } from '../lib/supabase'
import { generateTitle, extractTags } from '../utils/dumpUtils'
import { transcribeAudio } from '../utils/transcription'

const HomeScreen = () => {
  const { user } = useAuth()
  const [showWritingMode, setShowWritingMode] = useState(false)
  const [journalText, setJournalText] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'dumps' | 'account'>('home')
  const [isSaving, setIsSaving] = useState(false)

  const {
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
    uploadRecording
  } = useRecording()

  const handleStartRecording = async () => {
    await startRecording()
  }

  const handlePauseResume = async () => {
    if (isPaused) {
      await resumeRecording()
    } else {
      await pauseRecording()
    }
  }

  const handleStopAndSave = async () => {
    const uri = await stopRecording()
    if (uri && user) {
      await saveDump('', 'voice', uri)
    }
  }

  const handleRestart = async () => {
    await restartRecording()
  }

  const handleCancel = async () => {
    await cancelRecording()
  }

  const handleOpenWriting = () => {
    setShowWritingMode(true)
  }

  const handleCloseWriting = () => {
    setShowWritingMode(false)
    setJournalText('')
  }

  const saveDump = async (content: string, type: 'voice' | 'writing', audioUri?: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save dumps')
      return
    }

    try {
      setIsSaving(true)

      // Get current user ID from Supabase auth
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        throw new Error('No authenticated user found')
      }

      let finalContent = content
      let audioUrl = null

      // Handle voice recording
      if (type === 'voice' && audioUri) {
        // Upload audio first
        audioUrl = await uploadRecording(audioUri, currentUser.id)
        if (!audioUrl) {
          throw new Error('Failed to upload audio')
        }

        // Try to transcribe the audio
        console.log('Transcribing audio...')
        const transcript = await transcribeAudio(audioUri)

        if (transcript) {
          finalContent = transcript
          console.log('Transcription successful:', transcript.substring(0, 50) + '...')
        } else {
          finalContent = '[Voice recording - Transcription unavailable]'
          console.log('Transcription failed or unavailable')
        }
      }

      // Generate title and tags
      const title = finalContent ? generateTitle(finalContent) : 'Voice Note'
      const tags = finalContent ? extractTags(finalContent) : []

      // Save to database
      const { error } = await supabase
        .from('dumps')
        .insert({
          user_id: currentUser.id,
          title,
          content: finalContent,
          type,
          audio_url: audioUrl,
          tags,
          category: 'Journals', // Default category
        })

      if (error) throw error

      Alert.alert('Success', 'Dump saved successfully!')

      // Reset form if writing mode
      if (type === 'writing') {
        handleCloseWriting()
      }
    } catch (error) {
      console.error('Error saving dump:', error)
      Alert.alert('Error', 'Failed to save dump. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveJournal = async () => {
    if (!journalText.trim()) {
      Alert.alert('Empty Entry', 'Please write something before saving.')
      return
    }

    await saveDump(journalText, 'writing')
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Conditional Content Based on Active Tab */}
        {activeTab === 'home' ? (
          <>
            {/* Header */}
            <View style={styles.header} />

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.mainTitle}>Got something on your mind?</Text>
              <Text style={styles.mainSubtitle}>Say it. Type it. Dump it</Text>
              <Text style={styles.instructionText}>
                Tap the button to record ...or just type it out.
              </Text>

              {/* Microphone Button */}
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={handleStartRecording}
                activeOpacity={0.8}
              >
                <Ionicons name="mic" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Type Option */}
              <TouchableOpacity style={styles.typeButton} onPress={handleOpenWriting}>
                <Text style={styles.typeButtonText}>I'll like to do this in writing</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : activeTab === 'dumps' ? (
          <DumpsScreen />
        ) : (
          <AccountScreen />
        )}

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
            <View style={activeTab === 'home' ? styles.navIconActive : undefined}>
              <Ionicons name="home" size={24} color={activeTab === 'home' ? '#fff' : '#999'} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dumps')}>
            <View style={activeTab === 'dumps' ? styles.navIconActive : undefined}>
              <Ionicons name="folder" size={24} color={activeTab === 'dumps' ? '#fff' : '#999'} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('account')}>
            <View style={activeTab === 'account' ? styles.navIconActive : undefined}>
              <Ionicons name="person" size={24} color={activeTab === 'account' ? '#fff' : '#999'} />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Recording Modal */}
      <Modal
        visible={isRecording}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recordingCard}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancel}
            >
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>

            {/* Recording Indicator */}
            <View style={styles.recordingIndicator}>
              {!isPaused && <View style={styles.pulseCircle} />}
              <Ionicons
                name={isPaused ? "mic-off" : "mic"}
                size={48}
                color={isPaused ? "#999" : "#FF3B30"}
              />
            </View>

            {/* Status Text */}
            <Text style={styles.recordingText}>
              {isPaused ? 'Paused' : 'Recording...'}
            </Text>

            {/* Duration */}
            <Text style={styles.durationText}>
              {formatDuration(recordingDuration)}
            </Text>

            {/* Waveform */}
            <View style={styles.waveformContainer}>
              {[...Array(20)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    {
                      height: isPaused ? 10 : Math.random() * 40 + 10,
                      backgroundColor: isPaused ? '#ccc' : '#FF3B30'
                    }
                  ]}
                />
              ))}
            </View>

            {/* Controls */}
            <View style={styles.recordingControls}>
              {/* Restart Button */}
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleRestart}
              >
                <Ionicons name="refresh" size={24} color="#666" />
                <Text style={styles.controlButtonText}>Restart</Text>
              </TouchableOpacity>

              {/* Pause/Resume Button */}
              <TouchableOpacity
                style={[styles.controlButton, styles.primaryControlButton]}
                onPress={handlePauseResume}
              >
                <Ionicons
                  name={isPaused ? "play" : "pause"}
                  size={32}
                  color="#fff"
                />
              </TouchableOpacity>

              {/* Stop & Save Button */}
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleStopAndSave}
                disabled={isSaving}
              >
                <Ionicons name="checkmark" size={24} color="#4CAF50" />
                <Text style={[styles.controlButtonText, styles.saveText]}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Writing Mode Modal */}
      <Modal
        visible={showWritingMode}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.writingContainer}>
          <View style={styles.writingHeader}>
            <TouchableOpacity onPress={handleCloseWriting} disabled={isSaving}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.writingTitle}>Journal Entry</Text>
            <TouchableOpacity onPress={handleSaveJournal} disabled={isSaving}>
              <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.journalContainer}>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <TextInput
              style={styles.journalInput}
              placeholder="Start writing..."
              placeholderTextColor="#999"
              multiline
              value={journalText}
              onChangeText={setJournalText}
              autoFocus
              textAlignVertical="top"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000',
    marginBottom: 8,
  },
  mainSubtitle: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#999',
    marginBottom: 60,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  micButtonRecording: {
    backgroundColor: '#FF3B30',
    transform: [{ scale: 1.1 }],
  },
  typeButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  typeButtonText: {
    fontSize: 16,
    color: '#000',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  navItem: {
    padding: 8,
  },
  navIconActive: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '85%',
  },
  recordingIndicator: {
    position: 'relative',
    marginBottom: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    top: -16,
    left: -16,
  },
  recordingText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  recordingSubtext: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  durationText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  primaryControlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
  },
  controlButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  saveText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 60,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#FF3B30',
    borderRadius: 2,
  },
  writingContainer: {
    flex: 1,
    backgroundColor: '#FDFCF8',
  },
  writingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6E0',
  },
  writingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  journalContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  dateText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  journalInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    color: '#000',
    fontFamily: 'System',
  },
})

export default HomeScreen
