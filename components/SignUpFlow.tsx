import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
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

  const handleStep3Complete = async (password: string) => {
    try {
      console.log('Step 3: About to sign up with name:', name, 'email:', email)
      await signUp(name, email, password)
      console.log('Step 3: Sign up completed successfully')

      // Use a small delay to ensure auth state has settled
      setTimeout(() => {
        console.log('Step 3: Setting showVerification to true')
        setShowVerification(true)
        console.log('Step 3: showVerification state updated')
      }, 100)
    } catch (error) {
      console.error('Error completing sign up:', error)
      alert('Signup failed: ' + (error as Error).message)
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
