import { useState, useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LaunchScreen from './components/LaunchScreen'
import WelcomeScreen from './components/WelcomeScreen'
import LoginScreen from './components/LoginScreen'
import SignUpFlow from './components/SignUpFlow'
import OnboardingIntake from './components/OnboardingIntake'
import HomeScreen from './components/HomeScreen'

const Stack = createNativeStackNavigator()

function AppNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [showLaunch, setShowLaunch] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(true)
  const [showSignUp, setShowSignUp] = useState(false)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const onboarded = await AsyncStorage.getItem('hasOnboarded')
      setHasOnboarded(onboarded === 'true')

      // Show launch screen for 2 seconds
      setTimeout(() => {
        setShowLaunch(false)
        setIsLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      setIsLoading(false)
    }
  }

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true')
      setHasOnboarded(true)
    } catch (error) {
      console.error('Error saving onboarding status:', error)
    }
  }

  const handleSignUpComplete = () => {
    setShowSignUp(false)
  }

  if (showLaunch || isLoading || authLoading) {
    return (
      <>
        <LaunchScreen />
        <StatusBar style="light" />
      </>
    )
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!isAuthenticated ? (
            <>
              {showWelcome ? (
                <Stack.Screen name="Welcome">
                  {props => (
                    <WelcomeScreen
                      {...props}
                      onGetStarted={() => {
                        setShowWelcome(false)
                        setShowSignUp(true)
                      }}
                      onLogin={() => {
                        setShowWelcome(false)
                        setShowSignUp(false)
                      }}
                    />
                  )}
                </Stack.Screen>
              ) : showSignUp ? (
                <Stack.Screen name="SignUp">
                  {props => (
                    <SignUpFlow
                      {...props}
                      onComplete={handleSignUpComplete}
                      onBack={() => setShowWelcome(true)}
                    />
                  )}
                </Stack.Screen>
              ) : (
                <Stack.Screen name="Login">
                  {props => (
                    <LoginScreen
                      {...props}
                      onSignUpPress={() => setShowSignUp(true)}
                      onBack={() => setShowWelcome(true)}
                    />
                  )}
                </Stack.Screen>
              )}
            </>
          ) : !hasOnboarded ? (
            <Stack.Screen name="Onboarding">
              {props => (
                <OnboardingIntake
                  {...props}
                  onComplete={handleOnboardingComplete}
                />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Home" component={HomeScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  )
}
