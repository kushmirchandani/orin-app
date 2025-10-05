import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Image,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import DumpsScreen from './DumpsScreen'
import AccountScreen from './AccountScreen'
import BrainDashboard from './BrainDashboard'
import OrinAIChat from './OrinAIChat'
import Toast from './Toast'
import { useRecording } from '../hooks/useRecording'
import { supabase } from '../lib/supabase'
import { transcribeAudio } from '../utils/transcription'
import { analyzeWithOpenAI, calculateConfidence } from '../utils/analyzer'
import { generateEmbedding } from '../utils/embeddings'
import { parseResurfaceTiming, getTaskResurfaceSchedule } from '../utils/dateParser'
import { Asset } from 'expo-asset'

const HomeScreen = ({ route }: any) => {
  const { user } = useAuth()
  const [showWritingMode, setShowWritingMode] = useState(false)
  const [journalText, setJournalText] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'dumps' | 'mindmap' | 'account'>(
    route?.params?.initialTab || 'home'
  )
  const [isSaving, setIsSaving] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [gifLoaded, setGifLoaded] = useState(false)
  const [showOrinChat, setShowOrinChat] = useState(false)

  const widgetSlideAnim = useRef(new Animated.Value(300)).current

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

  // Preload the Orin AI gif
  useEffect(() => {
    const preloadGif = async () => {
      try {
        const asset = Asset.fromModule(require('../assets/orinAI-motion.gif'))
        await asset.downloadAsync()
        setGifLoaded(true)
      } catch (error) {
        console.error('Error preloading gif:', error)
        setGifLoaded(true) // Still show UI even if preload fails
      }
    }

    preloadGif()
  }, [])

  // Animate widget slide in/out
  useEffect(() => {
    if (isRecording) {
      Animated.timing(widgetSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(widgetSlideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [isRecording])

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
    if (user && uri) {
      // Save immediately as mind_dump, then process in background
      await saveVoiceNote(uri)
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

  const saveVoiceNote = async (audioUri: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save voice notes')
      return
    }

    try {
      setIsSaving(true)

      // Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        throw new Error('No authenticated user found')
      }

      // Upload audio first
      const audioUrl = await uploadRecording(audioUri, currentUser.id)
      if (!audioUrl) {
        throw new Error('Failed to upload audio file')
      }

      // Create mind_dump record
      const { data: mindDump, error: dumpError } = await supabase
        .from('mind_dumps')
        .insert({
          user_id: currentUser.id,
          source: 'voice',
          raw_text: '[Transcribing...]',
          audio_url: audioUrl,
          processed: false,
        })
        .select()
        .single()

      if (dumpError) throw dumpError

      // Show toast notification
      setToastMessage('Voice note saved! Processing in background...')
      setToastType('success')
      setToastVisible(true)

      // Process in background
      processMindDump(mindDump.id, audioUri)
    } catch (error) {
      console.error('Error saving voice note:', error)
      Alert.alert('Error', 'Failed to save voice note. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const processMindDump = async (dumpId: string, audioUri: string) => {
    try {
      console.log('Starting processing for mind dump:', dumpId)

      // Get user timezone (you could store this in user profile)
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'

      // Step 1: Transcribe with Whisper
      console.log('Transcribing audio...')
      const transcript = await transcribeAudio(audioUri)

      if (!transcript) {
        console.error('Transcription failed')
        return
      }

      console.log('Transcription complete')

      // Update raw_text
      await supabase
        .from('mind_dumps')
        .update({ raw_text: transcript })
        .eq('id', dumpId)

      // Step 2: Analyze with OpenAI
      console.log('Analyzing with OpenAI...')
      const analyzed = await analyzeWithOpenAI(transcript, userTimezone)

      if (!analyzed || !analyzed.thoughts || analyzed.thoughts.length === 0) {
        console.error('OpenAI analysis failed or returned no thoughts')
        await supabase
          .from('mind_dumps')
          .update({ processed: true })
          .eq('id', dumpId)
        return
      }

      console.log(`Analysis complete: ${analyzed.thoughts.length} thoughts extracted`)

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      // Step 3: Insert thoughts into database
      for (const thought of analyzed.thoughts) {
        try {
          // Parse resurface timing
          const resurfaceAt = parseResurfaceTiming(
            thought.resurface_timing,
            thought.deadline
          )

          // Calculate confidence
          const confidence = calculateConfidence(thought)

          // Insert thought
          const { data: insertedThought, error: thoughtError } = await supabase
            .from('thoughts')
            .insert({
              dump_id: dumpId,
              user_id: currentUser.id,
              thought_text: thought.thought_text,
              type: thought.type,
              importance: thought.importance,
              deadline: thought.deadline,
              time_needed_minutes: thought.time_needed_minutes,
              category: thought.category,
              next_action: thought.next_action,
              sentiment: thought.sentiment,
              resurface_at: resurfaceAt,
              confidence,
              subtasks: thought.subtasks || null,
            })
            .select()
            .single()

          if (thoughtError) {
            console.error('Error inserting thought:', thoughtError)
            continue
          }

          // Step 4: Save subtasks if they exist
          if (thought.subtasks && thought.subtasks.length > 0) {
            for (const subtask of thought.subtasks) {
              try {
                // Create a thought for each subtask
                const { data: subtaskThought, error: subtaskError } = await supabase
                  .from('thoughts')
                  .insert({
                    dump_id: dumpId,
                    user_id: currentUser.id,
                    thought_text: subtask.text,
                    type: 'task',
                    importance: thought.importance,
                    deadline: thought.deadline,
                    category: thought.category,
                    sentiment: 'neutral',
                    confidence: 0.9,
                  })
                  .select()
                  .single()

                if (!subtaskError && subtaskThought) {
                  // Create relation linking subtask to parent
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

          // Step 5: Generate and store embedding
          const embedding = await generateEmbedding(thought.thought_text)
          if (embedding) {
            await supabase.from('thought_vectors').insert({
              thought_id: insertedThought.id,
              embedding: JSON.stringify(embedding),
            })
          }
        } catch (error) {
          console.error('Error processing thought:', error)
        }
      }

      // Mark as processed
      await supabase
        .from('mind_dumps')
        .update({
          processed: true,
          model_version: 'gpt-4o-mini-v1',
        })
        .eq('id', dumpId)

      console.log('Mind dump processing complete!')
    } catch (error) {
      console.error('Error processing mind dump:', error)
    }
  }

  const handleSaveJournal = async () => {
    if (!journalText.trim()) {
      Alert.alert('Empty Entry', 'Please write something before saving.')
      return
    }

    try {
      setIsSaving(true)

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        throw new Error('No authenticated user found')
      }

      // Create mind_dump for text entry
      const { data: mindDump, error: dumpError } = await supabase
        .from('mind_dumps')
        .insert({
          user_id: currentUser.id,
          source: 'text',
          raw_text: journalText,
          processed: false,
        })
        .select()
        .single()

      if (dumpError) throw dumpError

      // Show toast notification
      setToastMessage('Entry saved! Processing in background...')
      setToastType('success')
      setToastVisible(true)

      // Process text entry (same pipeline as voice)
      processMindDumpText(mindDump.id, journalText)

      handleCloseWriting()
    } catch (error) {
      console.error('Error saving journal:', error)
      Alert.alert('Error', 'Failed to save entry. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const processMindDumpText = async (dumpId: string, text: string) => {
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'

      // Analyze with OpenAI (skip transcription for text)
      const analyzed = await analyzeWithOpenAI(text, userTimezone)

      if (!analyzed || !analyzed.thoughts || analyzed.thoughts.length === 0) {
        await supabase.from('mind_dumps').update({ processed: true }).eq('id', dumpId)
        return
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      // Insert thoughts (same as voice)
      for (const thought of analyzed.thoughts) {
        try {
          const resurfaceAt = parseResurfaceTiming(thought.resurface_timing, thought.deadline)
          const confidence = calculateConfidence(thought)

          const { data: insertedThought, error } = await supabase
            .from('thoughts')
            .insert({
              dump_id: dumpId,
              user_id: currentUser.id,
              thought_text: thought.thought_text,
              type: thought.type,
              importance: thought.importance,
              deadline: thought.deadline,
              time_needed_minutes: thought.time_needed_minutes,
              category: thought.category,
              next_action: thought.next_action,
              sentiment: thought.sentiment,
              resurface_at: resurfaceAt,
              confidence,
              subtasks: thought.subtasks || null,
            })
            .select()
            .single()

          if (error) continue

          // Save subtasks if they exist
          if (thought.subtasks && thought.subtasks.length > 0) {
            for (const subtask of thought.subtasks) {
              try {
                const { data: subtaskThought, error: subtaskError } = await supabase
                  .from('thoughts')
                  .insert({
                    dump_id: dumpId,
                    user_id: currentUser.id,
                    thought_text: subtask.text,
                    type: 'task',
                    importance: thought.importance,
                    deadline: thought.deadline,
                    category: thought.category,
                    sentiment: 'neutral',
                    confidence: 0.9,
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

          // Generate embedding
          const embedding = await generateEmbedding(thought.thought_text)
          if (embedding) {
            await supabase.from('thought_vectors').insert({
              thought_id: insertedThought.id,
              embedding: JSON.stringify(embedding),
            })
          }
        } catch (error) {
          console.error('Error processing thought:', error)
        }
      }

      await supabase
        .from('mind_dumps')
        .update({ processed: true, model_version: 'gpt-4o-mini-v1' })
        .eq('id', dumpId)

      console.log('Text entry processing complete!')
    } catch (error) {
      console.error('Error processing text entry:', error)
    }
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Toast Notification */}
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onHide={() => setToastVisible(false)}
        />

        {/* Conditional Content Based on Active Tab */}
        {activeTab === 'home' ? (
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setShowOrinChat(true)}
                style={styles.chatButton}
              >
                <Ionicons name="chatbubbles" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.mainTitle}>What's on your mind?</Text>
              <Text style={styles.instructionText}>Say it. Type it. Dump it.</Text>

              {/* Orin AI Button */}
              <TouchableOpacity
                style={styles.orinButton}
                onPress={handleStartRecording}
                activeOpacity={0.8}
              >
                <Image
                  source={require('../assets/orinAI-motion.gif')}
                  style={styles.orinGif}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Input Options */}
              <View style={styles.inputOptionsContainer}>
                <TouchableOpacity
                  style={styles.inputOption}
                  onPress={handleStartRecording}
                >
                  <Ionicons name="mic" size={20} color="#000" />
                  <Text style={styles.inputOptionText}>Voice</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.inputOption}
                  onPress={handleOpenWriting}
                >
                  <Ionicons name="create-outline" size={20} color="#000" />
                  <Text style={styles.inputOptionText}>Write</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : activeTab === 'dumps' ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setShowOrinChat(true)}
                style={styles.chatButton}
              >
                <Ionicons name="chatbubbles" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <DumpsScreen />
          </>
        ) : activeTab === 'mindmap' ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setShowOrinChat(true)}
                style={styles.chatButton}
              >
                <Ionicons name="chatbubbles" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <BrainDashboard />
          </>
        ) : (
          <>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setShowOrinChat(true)}
                style={styles.chatButton}
              >
                <Ionicons name="chatbubbles" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <AccountScreen />
          </>
        )}

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.orinLogoButton} onPress={() => setActiveTab('home')}>
            <View style={styles.orinLogoActive}>
              <Image
                source={require('../assets/images/orin-logo.png')}
                style={styles.orinLogoImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          <View style={styles.navPillContainer}>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dumps')}>
              <Ionicons name="journal-outline" size={24} color={activeTab === 'dumps' ? '#000' : '#999'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('mindmap')}>
              <Ionicons name="brain-outline" size={24} color={activeTab === 'mindmap' ? '#000' : '#999'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('account')}>
              <Ionicons name="person-outline" size={24} color={activeTab === 'account' ? '#000' : '#999'} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Recording Widget */}
      <Animated.View
        style={[
          styles.recordingWidget,
          {
            transform: [{ translateY: widgetSlideAnim }]
          }
        ]}
        pointerEvents={isRecording ? 'auto' : 'none'}
      >
        <View style={styles.widgetContent}>
          {/* Recording pulse indicator */}
          {!isPaused && <View style={styles.widgetPulse} />}

          {/* Time and status */}
          <View style={styles.widgetInfo}>
            <Text style={styles.widgetTime}>{formatDuration(recordingDuration)}</Text>
            <Text style={styles.widgetStatus}>{isPaused ? 'Paused' : 'Recording'}</Text>
          </View>
        </View>

        {/* Controls Row */}
        <View style={styles.widgetControlsRow}>
          <TouchableOpacity
            style={styles.widgetButton}
            onPress={handleRestart}
          >
            <Ionicons name="refresh" size={22} color="#fff" />
            <Text style={styles.widgetButtonLabel}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.widgetButton}
            onPress={handleCancel}
          >
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            <Text style={styles.widgetButtonLabel}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.widgetButton}
            onPress={handlePauseResume}
          >
            <Ionicons name={isPaused ? "play" : "pause"} size={22} color="#fff" />
            <Text style={styles.widgetButtonLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.widgetButton, styles.widgetButtonPrimary]}
            onPress={handleStopAndSave}
            disabled={isSaving}
          >
            <Ionicons name="checkmark" size={24} color="#4CAF50" />
            <Text style={[styles.widgetButtonLabel, styles.widgetButtonLabelPrimary]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Writing Mode Modal - Popover Style */}
      <Modal
        visible={showWritingMode}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.popoverOverlay}>
          <View style={styles.popoverContainer}>
            <View style={styles.popoverHeader}>
              <TouchableOpacity onPress={handleCloseWriting} disabled={isSaving}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.popoverTitle}>Quick Entry</Text>
              <TouchableOpacity onPress={handleSaveJournal} disabled={isSaving}>
                <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.popoverInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              multiline
              value={journalText}
              onChangeText={setJournalText}
              autoFocus
              textAlignVertical="top"
            />
          </View>
        </View>
      </Modal>

      {/* Orin AI Chat Modal */}
      <Modal
        visible={showOrinChat}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <OrinAIChat onClose={() => setShowOrinChat(false)} />
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  chatButton: {
    padding: 8,
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
    fontWeight: '800',
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
    fontSize: 20,
    textAlign: 'center',
    color: '#999',
    marginBottom: 60,
  },
  orinButton: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: -20,
  },
  orinGif: {
    width: 240,
    height: 240,
  },
  inputOptionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  inputOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  inputOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#D0D0D0',
    marginHorizontal: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  navPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 32,
    gap: 24,
  },
  navItem: {
    padding: 8,
  },
  orinLogoButton: {
    padding: 0,
  },
  orinLogoActive: {
    backgroundColor: '#000',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orinLogoImage: {
    width: 36,
    height: 36,
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
  // Popover styles
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  popoverContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    height: '90%',
  },
  popoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  popoverTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  popoverInput: {
    minHeight: 200,
    maxHeight: 400,
    fontSize: 16,
    lineHeight: 24,
    color: '#000',
    padding: 20,
  },
  // Recording Widget styles
  recordingWidget: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  widgetContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  widgetPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  widgetInfo: {
    flex: 1,
    marginLeft: 12,
  },
  widgetTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  widgetStatus: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  widgetControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  widgetButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetButtonPrimary: {
    backgroundColor: '#1a4d2e',
  },
  widgetButtonLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  widgetButtonLabelPrimary: {
    color: '#4CAF50',
  },
})

export default HomeScreen
