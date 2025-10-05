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
  ImageBackground,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTypewriter } from '../hooks/useTypewriter'

interface SignUpStep2Props {
  name: string
  onNext: (email: string) => void
  onBack: () => void
}

const SignUpStep2 = ({ name, onNext, onBack }: SignUpStep2Props) => {
  const [email, setEmail] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const { displayText, isComplete } = useTypewriter({
    text: `Hey ${name}, what's your email?`,
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

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleContinue = () => {
    if (email.trim() && isValidEmail(email)) {
      onNext(email.trim().toLowerCase())
    }
  }

  return (
    <ImageBackground
      source={require('../assets/images/onboarding-bg.png')}
      style={styles.container}
      resizeMode="cover"
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
                  <Text style={[styles.cursor, !showCursor && styles.cursorHidden]}>|</Text>
                </Text>
              </View>

              <TextInput
                style={[styles.input, isFocused && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                placeholder="john.doe@email.com"
                placeholderTextColor="#d3d3d3"
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleContinue}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                caretHidden={true}
              />

              {email && !isValidEmail(email) && (
                <Text style={styles.errorText}>Please enter a valid email</Text>
              )}

              <TouchableOpacity
                style={[styles.button, (!email.trim() || !isValidEmail(email)) && styles.buttonDisabled]}
                onPress={handleContinue}
                disabled={!email.trim() || !isValidEmail(email)}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
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
    marginBottom: 80,
  },
  promptText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 40,
  },
  cursor: {
    color: '#1a1a1a',
  },
  cursorHidden: {
    opacity: 0,
  },
  input: {
    fontSize: 20,
    color: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    marginBottom: 12,
    outlineStyle: 'none',
  },
  inputFocused: {
    borderBottomColor: '#000',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
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

export default SignUpStep2
