import { useState, useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Asset } from 'expo-asset'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LaunchScreen from './components/LaunchScreen'
import WelcomeScreen from './components/WelcomeScreen'
import LoginScreen from './components/LoginScreen'
import SignUpFlow from './components/SignUpFlow'
import OnboardingIntake from './components/OnboardingIntake'
import HomeScreen from './components/HomeScreen'

const Stack = createNativeStackNavigator()

function AppNavigator() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [showLaunch, setShowLaunch] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(true)
  const [showSignUp, setShowSignUp] = useState(false)
  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false)

  const hasOnboarded = user?.onboardingComplete || false

  useEffect(() => {
    console.log('App State:', {
      isAuthenticated,
      authLoading,
      hasOnboarded,
      showLaunch,
      isLoading,
      showWelcome,
      showSignUp,
      userOnboardingComplete: user?.onboardingComplete
    })
  }, [isAuthenticated, authLoading, hasOnboarded, showLaunch, isLoading, showWelcome, showSignUp, user])

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      // Preload background images
      await Promise.all([
        Asset.fromModule(require('./assets/images/onboarding-bg.png')).downloadAsync(),
        Asset.fromModule(require('./assets/images/constellation-bg.png')).downloadAsync(),
      ])

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
    // Onboarding complete is now managed in the database
    // The OnboardingIntake component will update it directly
    setJustCompletedOnboarding(true)
  }

  const handleSignUpComplete = () => {
    console.log('handleSignUpComplete called - setting showSignUp to false')
    setShowSignUp(false)
    setShowWelcome(false)
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
            <Stack.Screen name="Home">
              {props => (
                <HomeScreen
                  {...props}
                  route={{ params: { initialTab: justCompletedOnboarding ? 'account' : 'home' } }}
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  )
}
