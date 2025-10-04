import { useState } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import OnboardingQuestion, { Question } from './OnboardingQuestion'
import { generateUserMemory } from '../utils/generateUserMemory'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface OnboardingIntakeProps {
  onComplete: () => void
}

const OnboardingIntake = ({ onComplete }: OnboardingIntakeProps) => {
  const { user } = useAuth()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const questions: Question[] = [
    {
      id: 'whatBringsYou',
      question: "What brings you to Orin today?",
      type: 'text',
      placeholder: "I want to feel less overwhelmed...",
      required: false,
    },
    {
      id: 'areasToOrganize',
      question: "What areas of your life do you want to organize?",
      type: 'multiSelect',
      options: ['Work', 'Personal', 'Health & Wellness', 'Relationships', 'Finance', 'Hobbies & Interests'],
      required: false,
    },
    {
      id: 'capturePreference',
      question: "How do you prefer to capture your thoughts?",
      type: 'multipleChoice',
      options: ['Voice notes', 'Writing', 'Both equally'],
      required: false,
    },
    {
      id: 'overwhelmedTime',
      question: "What time of day do you usually feel most overwhelmed?",
      type: 'multipleChoice',
      options: ['Morning', 'Afternoon', 'Evening', 'Night', 'Varies'],
      required: false,
    },
    {
      id: 'mainGoal',
      question: "What's your main goal with Orin?",
      type: 'text',
      placeholder: "Clear my mind and stay focused...",
      required: false,
    },
    {
      id: 'additionalInfo',
      question: "Anything else you'd like us to know?",
      type: 'text',
      placeholder: "Optional...",
      required: false,
    },
  ]

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  const handleAnswer = async (answer: any) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: answer,
    }
    setAnswers(newAnswers)

    if (isLastQuestion) {
      // Save to database
      await saveOnboardingData(newAnswers)
    } else {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleSkip = () => {
    if (isLastQuestion) {
      // Save what we have and complete
      saveOnboardingData(answers)
    } else {
      // Move to next question without saving answer
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const saveOnboardingData = async (finalAnswers: Record<string, any>) => {
    try {
      setIsSubmitting(true)

      // Generate user memory from answers
      const userMemory = generateUserMemory(finalAnswers)

      // Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) {
        throw new Error('No user found')
      }

      // Update profile with onboarding data and memory
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_data: finalAnswers,
          user_memory: userMemory,
        })
        .eq('id', currentUser.id)

      if (error) {
        throw error
      }

      // Complete onboarding
      onComplete()
    } catch (error) {
      console.error('Error saving onboarding data:', error)
      Alert.alert(
        'Error',
        'There was a problem saving your information. Please try again.',
        [
          { text: 'Skip', onPress: onComplete },
          { text: 'Retry', onPress: () => saveOnboardingData(finalAnswers) },
        ]
      )
    } finally {
      setIsSubmitting(false)
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
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.questionCounter}>
                <View style={styles.counterDot} />
                <View style={styles.counterDot} />
                <View style={styles.counterDot} />
              </View>
            </View>

            {/* Card with question */}
            <View style={styles.card}>
              <OnboardingQuestion
                question={currentQuestion}
                onAnswer={handleAnswer}
                onSkip={handleSkip}
                initialAnswer={answers[currentQuestion.id]}
              />
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
    paddingTop: 20,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  questionCounter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  counterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
})

export default OnboardingIntake
