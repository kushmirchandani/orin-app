import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Calendar from 'expo-calendar'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

interface CalendarPermissionScreenProps {
  onComplete: () => void
}

const CalendarPermissionScreen = ({ onComplete }: CalendarPermissionScreenProps) => {
  const [isEnabling, setIsEnabling] = useState(false)

  const handleEnableCalendar = async () => {
    try {
      setIsEnabling(true)

      // Request calendar permission
      const { status } = await Calendar.requestCalendarPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable calendar access in Settings so Orin knows when you\'re free.',
          [
            { text: 'Skip', onPress: onComplete },
            { text: 'OK' },
          ]
        )
        return
      }

      // Save calendar permission status
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await supabase
          .from('profiles')
          .update({ calendar_enabled: true })
          .eq('id', currentUser.id)
      }

      Alert.alert(
        'Calendar Connected! 📅',
        'Orin can now see when you\'re free and busy to send thoughtful reminders at the right time.',
        [{ text: 'Continue', onPress: onComplete }]
      )

    } catch (error) {
      console.error('Error enabling calendar:', error)
      Alert.alert(
        'Error',
        'Could not enable calendar access. You can always enable this later in settings.',
        [{ text: 'OK', onPress: onComplete }]
      )
    } finally {
      setIsEnabling(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Skip button */}
        <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar" size={64} color="#667eea" />
          </View>
        </View>

        {/* Header */}
        <Text style={styles.title}>Connect Your Calendar</Text>
        <Text style={styles.subtitle}>
          Let Orin know when you're free so it can send reminders at the perfect time
        </Text>

        {/* Benefits */}
        <View style={styles.benefits}>
          <View style={styles.benefitItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color="white" />
            </View>
            <Text style={styles.benefitText}>
              Reminders sent only when you're free
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color="white" />
            </View>
            <Text style={styles.benefitText}>
              No interruptions during meetings
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color="white" />
            </View>
            <Text style={styles.benefitText}>
              Read-only access (we never modify events)
            </Text>
          </View>
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed" size={16} color="#999" />
          <Text style={styles.privacyText}>
            Your calendar data stays private. We only check if you're busy or free.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.enableButton, isEnabling && styles.enableButtonDisabled]}
            onPress={handleEnableCalendar}
            disabled={isEnabling}
          >
            <Ionicons name="calendar-outline" size={24} color="white" />
            <Text style={styles.enableButtonText}>
              {isEnabling ? 'Connecting...' : 'Enable Calendar Access'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterButton} onPress={onComplete}>
            <Text style={styles.laterButtonText}>I'll do this later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#667eea',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  benefits: {
    gap: 20,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  privacyText: {
    fontSize: 14,
    color: '#999',
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    gap: 16,
  },
  enableButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    justifyContent: 'center',
  },
  enableButtonDisabled: {
    opacity: 0.6,
  },
  enableButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
})

export default CalendarPermissionScreen
