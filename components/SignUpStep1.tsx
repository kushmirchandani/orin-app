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
  Animated,
  ImageBackground,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTypewriter } from '../hooks/useTypewriter'
import { Ionicons } from '@expo/vector-icons'

interface SignUpStep1Props {
  onNext: (name: string) => void
  onBack?: () => void
}

const SignUpStep1 = ({ onNext, onBack }: SignUpStep1Props) => {
  const [name, setName] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const { displayText, isComplete } = useTypewriter({
    text: "What's your name?",
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

  const handleContinue = () => {
    if (name.trim()) {
      onNext(name.trim())
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
            {/* Back Button */}
            {onBack && (
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Logo at top */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/orin-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
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
                value={name}
                onChangeText={setName}
                placeholder="John"
                placeholderTextColor="#d3d3d3"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleContinue}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                caretHidden={true}
              />

              <TouchableOpacity
                style={[styles.button, !name.trim() && styles.buttonDisabled]}
                onPress={handleContinue}
                disabled={!name.trim()}
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 80,
    height: 80,
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
    marginBottom: 40,
    outlineStyle: 'none',
  },
  inputFocused: {
    borderBottomColor: '#000',
  },
  button: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
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

export default SignUpStep1
