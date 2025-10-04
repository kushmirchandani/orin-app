import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

const AccountScreen = () => {
  const { user, signOut } = useAuth()
  const [moodAnalysis, setMoodAnalysis] = useState(true)
  const [realTimeTranscription, setRealTimeTranscription] = useState(true)
  const [autoTagging, setAutoTagging] = useState(false)
  const [notifications, setNotifications] = useState(false)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with User Name */}
        <View style={styles.header}>
          <Text style={styles.userName}>{user?.name || user?.email || 'User'}</Text>
        </View>

        {/* AI Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Preferences</Text>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
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
              trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Dump Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dump Input</Text>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="square-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Default Dump Mode</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Auto-detect</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Real-time transcription</Text>
            </View>
            <Switch
              value={realTimeTranscription}
              onValueChange={setRealTimeTranscription}
              trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
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
              trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
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
              trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Account & Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & Data</Text>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="sparkles-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Subscription</Text>
            </View>
            <View style={styles.settingRight}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Free plan</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Privacy & Permissions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="server-outline" size={24} color="#000" />
              <Text style={styles.settingText}>Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
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
  settingText: {
    fontSize: 16,
    color: '#000',
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
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
})

export default AccountScreen
