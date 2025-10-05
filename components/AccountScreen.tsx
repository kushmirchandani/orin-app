import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, TextInput, Modal, Linking, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as Contacts from 'expo-contacts'
import * as Calendar from 'expo-calendar'
import { hasCalendarPermission, requestCalendarPermission } from '../utils/calendarUtils'
import { dummyThoughts } from '../utils/dummyData'

const AccountScreen = () => {
  const { user, signOut } = useAuth()
  const [moodAnalysis, setMoodAnalysis] = useState(true)
  const [realTimeTranscription, setRealTimeTranscription] = useState(true)
  const [autoTagging, setAutoTagging] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [calendarEnabled, setCalendarEnabled] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [editingPhone, setEditingPhone] = useState('')
  const [dummyDataEnabled, setDummyDataEnabled] = useState(false)

  useEffect(() => {
    loadUserSettings()
  }, [])

  const loadUserSettings = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const { data, error } = await supabase
        .from('profiles')
        .select('sms_enabled, calendar_enabled, phone_number, dummy_data_enabled')
        .eq('id', currentUser.id)
        .single()

      if (data) {
        setSmsEnabled(data.sms_enabled || false)
        setCalendarEnabled(data.calendar_enabled || false)
        setPhoneNumber(data.phone_number)
        setDummyDataEnabled(data.dummy_data_enabled || false)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleAddToContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable contacts access in Settings to add Orin to your contacts.',
          [{ text: 'OK' }]
        )
        return
      }

      const twilioNumber = process.env.EXPO_PUBLIC_TWILIO_PHONE_NUMBER || '+18574656428'

      // Load the app icon asset
      const { Asset } = require('expo-asset')
      const asset = Asset.fromModule(require('../assets/app-icon.png'))
      await asset.downloadAsync()

      const contact: Contacts.Contact = {
        name: 'Orin',
        firstName: 'Orin',
        contactType: Contacts.ContactTypes.Person,
        phoneNumbers: [
          {
            label: 'mobile',
            number: twilioNumber,
          },
        ],
        note: 'Your AI thought companion 💙',
        image: {
          uri: asset.localUri || asset.uri,
        },
      }

      // Present native contact UI for user to confirm and save
      await Contacts.presentFormAsync(null, contact)
    } catch (error) {
      console.error('Error presenting contact form:', error)
      Alert.alert('Error', 'Could not open contact form. Please try again.', [{ text: 'OK' }])
    }
  }

  const handleToggleCalendar = async (value: boolean) => {
    if (value) {
      // Enable calendar
      const granted = await requestCalendarPermission()

      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable calendar access in Settings so Orin knows when you\'re free.',
          [{ text: 'OK' }]
        )
        return
      }

      // Save to database
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await supabase
          .from('profiles')
          .update({ calendar_enabled: true })
          .eq('id', currentUser.id)
      }

      setCalendarEnabled(true)
      Alert.alert('Calendar Connected', 'Orin can now see when you\'re free! 📅', [{ text: 'OK' }])
    } else {
      // Disable calendar
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await supabase
          .from('profiles')
          .update({ calendar_enabled: false })
          .eq('id', currentUser.id)
      }
      setCalendarEnabled(false)
    }
  }

  const handleOpenPhoneModal = () => {
    setEditingPhone(phoneNumber || '')
    setShowPhoneModal(true)
  }

  const handleSavePhone = async () => {
    try {
      // Basic phone validation
      const cleanPhone = editingPhone.trim()
      if (!cleanPhone) {
        Alert.alert('Error', 'Please enter a phone number')
        return
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: cleanPhone,
          sms_enabled: true,
          sms_opt_in_date: new Date().toISOString(),
        })
        .eq('id', currentUser.id)

      if (error) throw error

      setPhoneNumber(cleanPhone)
      setSmsEnabled(true)
      setShowPhoneModal(false)

      // Send welcome SMS
      try {
        console.log('Attempting to send welcome SMS to user:', currentUser.id)
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            userId: currentUser.id,
            message: "Hey! I'm Orin, your AI thought companion 💙\n\nText me anytime to dump your thoughts, and I'll organize them for you. You can also ask me questions about your thoughts (e.g., \"What did I say about that project?\").\n\nLet's keep your mind clear together!"
          }
        })

        if (error) {
          console.error('Error response from send-sms function:', error)
        } else {
          console.log('Welcome SMS sent successfully:', data)
        }
      } catch (smsError) {
        console.error('Exception while sending welcome SMS:', smsError)
        // Don't fail the whole operation if SMS fails
      }

      Alert.alert('Success', 'Phone number saved! You can now receive SMS reminders.')
    } catch (error) {
      console.error('Error saving phone:', error)
      Alert.alert('Error', 'Could not save phone number. Please try again.')
    }
  }

  const handleRemovePhone = async () => {
    Alert.alert(
      'Remove Phone Number',
      'Are you sure you want to remove your phone number? You will no longer receive SMS reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser()
              if (!currentUser) return

              const { error } = await supabase
                .from('profiles')
                .update({
                  phone_number: null,
                  sms_enabled: false,
                })
                .eq('id', currentUser.id)

              if (error) throw error

              setPhoneNumber(null)
              setSmsEnabled(false)
              setShowPhoneModal(false)
            } catch (error) {
              console.error('Error removing phone:', error)
              Alert.alert('Error', 'Could not remove phone number. Please try again.')
            }
          }
        }
      ]
    )
  }

  const handleToggleDummyData = async (value: boolean) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      if (value) {
        // Load dummy data
        const now = new Date()
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        // First create a dummy mind dump entry
        const { data: dumpData, error: dumpError } = await supabase
          .from('mind_dumps')
          .insert({
            user_id: currentUser.id,
            audio_url: 'dummy',
            raw_text: 'Dummy data for testing',
            processed: true,
            source: 'import',
            created_at: now.toISOString(),
          })
          .select()
          .single()

        if (dumpError) throw dumpError

        const dummyThoughtsWithDates = dummyThoughts.map((thought, index) => {
          // Spread thoughts across the last month
          const randomDate = new Date(
            oneMonthAgo.getTime() + Math.random() * (now.getTime() - oneMonthAgo.getTime())
          )

          // Determine status based on type and age
          let status = 'open'
          const daysSinceCreated = (now.getTime() - randomDate.getTime()) / (1000 * 60 * 60 * 24)

          if (thought.type === 'task') {
            // 60% of old tasks (>2 weeks) should be completed
            if (daysSinceCreated > 14 && Math.random() > 0.4) {
              status = 'done'
            }
            // 30% of medium-age tasks (1-2 weeks) should be completed
            else if (daysSinceCreated > 7 && Math.random() > 0.7) {
              status = 'done'
            }
          } else if (thought.type === 'journal' || thought.type === 'note') {
            // Old journals/notes should be archived
            if (daysSinceCreated > 21) {
              status = 'archived'
            }
          }

          return {
            user_id: currentUser.id,
            dump_id: dumpData.id,
            ...thought,
            created_at: randomDate.toISOString(),
            status,
            source: 'app',
            resurface_at: thought.deadline ? new Date(thought.deadline).toISOString() : null,
          }
        })

        // Insert dummy thoughts
        const { error } = await supabase
          .from('thoughts')
          .insert(dummyThoughtsWithDates)

        if (error) throw error

        // Update profile
        await supabase
          .from('profiles')
          .update({ dummy_data_enabled: true })
          .eq('id', currentUser.id)

        setDummyDataEnabled(true)
        Alert.alert('Success', '100+ sample thoughts loaded! Switch tabs to see them.')
      } else {
        // Delete dummy data - find the dummy mind dump first
        const { data: dummyDump } = await supabase
          .from('mind_dumps')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('raw_text', 'Dummy data for testing')
          .single()

        if (dummyDump) {
          // Delete thoughts associated with dummy dump
          await supabase
            .from('thoughts')
            .delete()
            .eq('dump_id', dummyDump.id)

          // Delete the dummy dump
          await supabase
            .from('mind_dumps')
            .delete()
            .eq('id', dummyDump.id)
        }

        // Update profile
        await supabase
          .from('profiles')
          .update({ dummy_data_enabled: false })
          .eq('id', currentUser.id)

        setDummyDataEnabled(false)
        Alert.alert('Success', 'Dummy data removed! Switch tabs to refresh the view.')
      }
    } catch (error) {
      console.error('Error toggling dummy data:', error)
      Alert.alert('Error', 'Could not toggle dummy data')
    }
  }

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'Are you sure you want to delete all your thoughts, dumps, and data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser()
              if (!currentUser) return

              // Delete all user data but keep the account
              await supabase.from('thoughts').delete().eq('user_id', currentUser.id)
              await supabase.from('mind_dumps').delete().eq('user_id', currentUser.id)
              await supabase.from('thought_relations').delete().eq('parent_thought_id', currentUser.id)

              Alert.alert('Success', 'All your data has been deleted.')
            } catch (error) {
              console.error('Error deleting data:', error)
              Alert.alert('Error', 'Could not delete data. Please try again.')
            }
          }
        }
      ]
    )
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser()
              if (!currentUser) return

              // Delete user data
              await supabase.from('thoughts').delete().eq('user_id', currentUser.id)
              await supabase.from('profiles').delete().eq('id', currentUser.id)

              // Sign out
              await signOut()

              Alert.alert('Account Deleted', 'Your account has been permanently deleted.')
            } catch (error) {
              console.error('Error deleting account:', error)
              Alert.alert('Error', 'Could not delete account. Please try again.')
            }
          }
        }
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with User Info */}
        <View style={styles.header}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Integrations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integrations</Text>

          <TouchableOpacity style={styles.settingRow} onPress={handleOpenPhoneModal}>
            <View style={styles.settingLeft}>
              <Ionicons name="chatbubble-outline" size={24} color="#000" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>
                  {phoneNumber ? 'Change Phone Number' : 'Add Phone Number'}
                </Text>
                {phoneNumber && (
                  <Text style={styles.settingSubtext}>{phoneNumber}</Text>
                )}
              </View>
            </View>
            {phoneNumber ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTextGreen}>Active</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleAddToContacts}>
            <View style={styles.settingLeft}>
              <Ionicons name="person-add-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Add Orin to Contacts</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="calendar-outline" size={24} color="#000" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Calendar Access</Text>
                <Text style={styles.settingSubtext}>Smart reminder timing</Text>
              </View>
            </View>
            <Switch
              value={calendarEnabled}
              onValueChange={handleToggleCalendar}
              trackColor={{ false: '#E0E0E0', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* AI Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Preferences</Text>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="chatbox-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Tone</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Professional</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="happy-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Mood Analysis</Text>
            </View>
            <Switch
              value={moodAnalysis}
              onValueChange={setMoodAnalysis}
              trackColor={{ false: '#E0E0E0', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Developer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="flask-outline" size={24} color="#000" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Dummy Data</Text>
                <Text style={styles.settingSubtext}>Sample thoughts for testing</Text>
              </View>
            </View>
            <Switch
              value={dummyDataEnabled}
              onValueChange={handleToggleDummyData}
              trackColor={{ false: '#E0E0E0', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Dump Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dump Input</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Real-time transcription</Text>
            </View>
            <Switch
              value={realTimeTranscription}
              onValueChange={setRealTimeTranscription}
              trackColor={{ false: '#E0E0E0', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="pricetag-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Auto-Tagging</Text>
            </View>
            <Switch
              value={autoTagging}
              onValueChange={setAutoTagging}
              trackColor={{ false: '#E0E0E0', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E0E0E0', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Account & Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & Data</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://www.tryorin.com/legal')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Privacy & Terms</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAllData}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash-bin-outline" size={24} color="#FF9500" />
              <Text style={[styles.settingText, { color: '#FF9500' }]}>Delete All Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF9500" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              <Text style={[styles.settingText, { color: '#FF3B30' }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Phone Number Modal */}
      <Modal
        visible={showPhoneModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPhoneModal(false)}
          >
            <TouchableOpacity
              style={styles.modalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {phoneNumber ? 'Change Phone Number' : 'Add Phone Number'}
                </Text>
                <TouchableOpacity onPress={() => setShowPhoneModal(false)}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <Text style={styles.modalDescription}>
                  Get SMS reminders and text your thoughts to Orin anytime.
                </Text>

                <TextInput
                  style={styles.phoneInput}
                  value={editingPhone}
                  onChangeText={setEditingPhone}
                  placeholder="+1 (555) 123-4567"
                  keyboardType="phone-pad"
                  autoFocus
                  returnKeyType="done"
                  blurOnSubmit={true}
                />

                <TouchableOpacity style={styles.saveButton} onPress={handleSavePhone}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

                {phoneNumber && (
                  <TouchableOpacity style={styles.removeButton} onPress={handleRemovePhone}>
                    <Text style={styles.removeButtonText}>Remove Phone Number</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  settingInfo: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#000',
  },
  settingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 16,
    color: '#999',
  },
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  badgeTextGreen: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default AccountScreen
