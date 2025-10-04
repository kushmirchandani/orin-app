import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import DumpsScreen from './DumpsScreen'
import AccountScreen from './AccountScreen'

const HomeScreen = () => {
  const { signOut } = useAuth()
  const [isRecording, setIsRecording] = useState(false)
  const [showWritingMode, setShowWritingMode] = useState(false)
  const [journalText, setJournalText] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'dumps' | 'account'>('home')

  const handlePressIn = () => {
    setIsRecording(true)
  }

  const handlePressOut = () => {
    setIsRecording(false)
  }

  const handleOpenWriting = () => {
    setShowWritingMode(true)
  }

  const handleCloseWriting = () => {
    setShowWritingMode(false)
    setJournalText('')
  }

  const handleSaveJournal = () => {
    // TODO: Save to database
    console.log('Saving journal:', journalText)
    handleCloseWriting()
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
                Tap and hold on the button to speak ...or just type it out.
              </Text>

              {/* Microphone Button */}
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
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
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recordingCard}>
            <View style={styles.recordingIndicator}>
              <View style={styles.pulseCircle} />
              <Ionicons name="mic" size={48} color="#FF3B30" />
            </View>
            <Text style={styles.recordingText}>Recording...</Text>
            <Text style={styles.recordingSubtext}>Release to stop</Text>
            <View style={styles.waveformContainer}>
              {[...Array(20)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    { height: Math.random() * 40 + 10 }
                  ]}
                />
              ))}
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
            <TouchableOpacity onPress={handleCloseWriting}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.writingTitle}>Journal Entry</Text>
            <TouchableOpacity onPress={handleSaveJournal}>
              <Text style={styles.saveButton}>Save</Text>
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
