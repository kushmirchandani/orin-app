import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTypewriter } from '../hooks/useTypewriter'

interface SignUpStep3Props {
  onComplete: (password: string) => void
  onBack: () => void
}

const SignUpStep3 = ({ onComplete, onBack }: SignUpStep3Props) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { displayText, isComplete } = useTypewriter({
    text: "Create a secure password",
    speed: 60,
    delay: 500
  })
  const [showCursor, setShowCursor] = useState(true)

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  const passwordsMatch = password === confirmPassword && password.length > 0
  const isPasswordStrong = password.length >= 8

  const handleComplete = () => {
    if (passwordsMatch && isPasswordStrong) {
      onComplete(password)
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Back button and Logo */}
            <View style={styles.topRow}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
              <Image
                source={require('../assets/images/orin-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.placeholder} />
            </View>

            {/* Card with content */}
            <View style={styles.card}>
              <View style={styles.promptContainer}>
                <Text style={styles.promptText}>
                  {displayText}
                  {showCursor && <Text style={styles.cursor}>|</Text>}
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#d3d3d3"
                  secureTextEntry
                  autoFocus
                  returnKeyType="next"
                  caretHidden={true}
                />
                {password.length > 0 && !isPasswordStrong && (
                  <Text style={styles.hintText}>Password must be at least 8 characters</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#d3d3d3"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleComplete}
                  caretHidden={true}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <Text style={styles.errorText}>Passwords don't match</Text>
                )}
                {passwordsMatch && isPasswordStrong && (
                  <Text style={styles.successText}>✓ Passwords match</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, (!passwordsMatch || !isPasswordStrong) && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={!passwordsMatch || !isPasswordStrong}
              >
                <Text style={styles.buttonText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
  },
  logo: {
    width: 60,
    height: 60,
  },
  placeholder: {
    width: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  promptContainer: {
    marginBottom: 60,
  },
  promptText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cursor: {
    color: '#1a1a1a',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    fontSize: 18,
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    outlineStyle: 'none',
  },
  hintText: {
    color: '#999',
    fontSize: 12,
    marginTop: 6,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 6,
  },
  successText: {
    color: '#51cf66',
    fontSize: 12,
    marginTop: 6,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
})

export default SignUpStep3
