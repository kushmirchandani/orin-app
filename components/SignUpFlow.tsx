import { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import SignUpStep1 from './SignUpStep1'
import SignUpStep2 from './SignUpStep2'
import SignUpStep3 from './SignUpStep3'
import EmailVerificationScreen from './EmailVerificationScreen'

interface SignUpFlowProps {
  onComplete: () => void
  onBack?: () => void
}

const SignUpFlow = ({ onComplete, onBack }: SignUpFlowProps) => {
  const { signUp } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showVerification, setShowVerification] = useState(false)

  useEffect(() => {
    console.log('SignUpFlow: showVerification changed to:', showVerification)
  }, [showVerification])

  useEffect(() => {
    console.log('SignUpFlow: currentStep changed to:', currentStep)
  }, [currentStep])

  const handleStep1Complete = (firstName: string) => {
    setName(firstName)
    setCurrentStep(2)
  }

  const handleStep2Complete = (userEmail: string) => {
    setEmail(userEmail)
    setCurrentStep(3)
  }

  const handleStep3Complete = async (userPassword: string) => {
    try {
      console.log('Step 3: About to sign up with name:', name, 'email:', email)
      setPassword(userPassword)
      await signUp(name, email, userPassword)
      console.log('Step 3: Sign up completed successfully')

      // Give auth state a moment to update, then proceed to onboarding
      setTimeout(() => {
        console.log('Step 3: Calling onComplete to proceed to onboarding')
        onComplete()
      }, 500)
    } catch (error) {
      console.error('Error completing sign up:', error)
      const errorMessage = (error as Error).message

      // Handle specific error cases with user-friendly messages
      if (errorMessage.includes('User already registered')) {
        Alert.alert(
          'Email Already Registered',
          'This email is already registered. Please try logging in instead, or use a different email.',
          [{ text: 'OK' }]
        )
      } else if (errorMessage.includes('Invalid email')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.', [{ text: 'OK' }])
      } else if (errorMessage.includes('Password')) {
        Alert.alert('Invalid Password', 'Password must be at least 6 characters long.', [{ text: 'OK' }])
      } else {
        Alert.alert('Signup Failed', errorMessage, [{ text: 'OK' }])
      }
    }
  }

  const handleVerificationComplete = () => {
    // User has verified their email, complete the signup flow
    onComplete()
  }

  // Show email verification screen if user has signed up
  if (showVerification) {
    console.log('SignUpFlow: Rendering EmailVerificationScreen for:', email)
    return (
      <EmailVerificationScreen
        email={email}
        password={password}
        onVerified={handleVerificationComplete}
      />
    )
  }

  if (currentStep === 1) {
    console.log('SignUpFlow: Rendering Step 1')
    return <SignUpStep1 onNext={handleStep1Complete} onBack={onBack} />
  }

  if (currentStep === 2) {
    console.log('SignUpFlow: Rendering Step 2 for name:', name)
    return (
      <SignUpStep2
        name={name}
        onNext={handleStep2Complete}
        onBack={() => setCurrentStep(1)}
      />
    )
  }

  console.log('SignUpFlow: Rendering Step 3 for email:', email)
  return (
    <SignUpStep3
      onComplete={handleStep3Complete}
      onBack={() => setCurrentStep(2)}
    />
  )
}

export default SignUpFlow
