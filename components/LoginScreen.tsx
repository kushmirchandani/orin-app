import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ImageBackground,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'

interface LoginScreenProps {
  onSignUpPress: () => void
  onBack?: () => void
}

const LoginScreen = ({ onSignUpPress, onBack }: LoginScreenProps) => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSignIn = async () => {
    setErrorMessage('') // Clear previous errors

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password')
      console.log('Error: Missing email or password')
      return
    }

    setIsLoading(true)
    console.log('Attempting sign in...')
    const success = await signIn(email.trim().toLowerCase(), password)
    console.log('Sign in result:', success)
    setIsLoading(false)

    if (!success) {
      console.log('Setting error message')
      setErrorMessage("Check your email/password, that's not a match :/")
      console.log('Error message set to:', "Check your email/password, that's not a match :/")
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

            <View style={styles.headerContainer}>
              <Image
                source={require('../assets/images/orin-logo-white.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.title}>Welcome back</Text>

              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                caretHidden={true}
              />

              <TextInput
                style={[styles.input, styles.inputSpacing, passwordFocused && styles.inputFocused]}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                caretHidden={true}
              />

              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.signInButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={isLoading}
              >
                <Text style={styles.signInButtonText}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity onPress={onSignUpPress}>
                  <Text style={styles.signUpLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 32,
  },
  input: {
    fontSize: 18,
    color: 'white',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 12,
    outlineStyle: 'none',
  },
  inputFocused: {
    borderBottomColor: '#fff',
  },
  inputSpacing: {
    marginTop: 16,
  },
  signInButton: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  signInButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpText: {
    color: 'white',
    fontSize: 16,
  },
  signUpLink: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
})

export default LoginScreen
