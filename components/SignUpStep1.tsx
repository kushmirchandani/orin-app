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
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTypewriter } from '../hooks/useTypewriter'
import { Ionicons } from '@expo/vector-icons'

interface SignUpStep1Props {
  onNext: (name: string) => void
  onBack?: () => void
}

const SignUpStep1 = ({ onNext, onBack }: SignUpStep1Props) => {
  const [name, setName] = useState('')
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
                  {showCursor && <Text style={styles.cursor}>|</Text>}
                </Text>
              </View>

              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John"
                placeholderTextColor="#d3d3d3"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleContinue}
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
  input: {
    fontSize: 20,
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 40,
    outlineStyle: 'none',
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
