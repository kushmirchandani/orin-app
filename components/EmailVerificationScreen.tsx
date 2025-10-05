import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

interface EmailVerificationScreenProps {
  email: string
  password: string
  onVerified: () => void
}

const EmailVerificationScreen = ({ email, password, onVerified }: EmailVerificationScreenProps) => {
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll for email verification
  const checkVerification = async () => {
    try {
      setIsChecking(true)
      setError(null)

      // Try to refresh the session first
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()

      if (sessionError || !session) {
        // Session expired, sign in with credentials
        console.log('Session expired, signing in with credentials...')
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          console.error('Error signing in:', signInError)
          setError('Please verify your email first, then try again.')
          return
        }

        if (signInData.user?.email_confirmed_at) {
          onVerified()
        } else {
          setError('Email not yet verified. Please check your inbox and click the confirmation link.')
        }
      } else {
        // Check if email is confirmed
        if (session.user.email_confirmed_at) {
          onVerified()
        } else {
          setError('Email not yet verified. Please check your inbox and click the confirmation link.')
        }
      }
    } catch (err) {
      console.error('Error checking verification:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <LinearGradient
      colors={['#7B9FDB', '#5B6FBF', '#5F63B3']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.card}>
            {/* Email Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={64} color="#667eea" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Check your email</Text>

            {/* Description */}
            <Text style={styles.description}>
              We've sent a confirmation email to{'\n'}
              <Text style={styles.email}>{email}</Text>
            </Text>

            <Text style={styles.instructions}>
              Click the link in the email to verify your account, then come back here and tap the button below.
            </Text>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Verification Button */}
            <TouchableOpacity
              style={[styles.verifyButton, isChecking && styles.verifyButtonDisabled]}
              onPress={checkVerification}
              disabled={isChecking}
            >
              {isChecking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>I've Verified My Email</Text>
              )}
            </TouchableOpacity>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                Didn't receive the email? Check your spam folder or
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  // Resend verification email
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) {
                    await supabase.auth.resend({
                      type: 'signup',
                      email: email,
                    })
                    alert('Verification email resent!')
                  }
                }}
              >
                <Text style={styles.resendLink}>resend the email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  email: {
    fontWeight: '600',
    color: '#667eea',
  },
  instructions: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#667eea',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  resendLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
})

export default EmailVerificationScreen
