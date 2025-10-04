import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { useTypewriter } from '../hooks/useTypewriter'

export type QuestionType = 'text' | 'multipleChoice' | 'multiSelect' | 'scale'

export interface Question {
  id: string
  question: string
  type: QuestionType
  options?: string[]
  placeholder?: string
  required?: boolean
}

interface OnboardingQuestionProps {
  question: Question
  onAnswer: (answer: any) => void
  onSkip?: () => void
  initialAnswer?: any
}

const OnboardingQuestion = ({
  question,
  onAnswer,
  onSkip,
  initialAnswer,
}: OnboardingQuestionProps) => {
  const { displayText, isComplete } = useTypewriter({
    text: question.question,
    speed: 40,
    delay: 300,
  })
  const [showCursor, setShowCursor] = useState(true)
  const [answer, setAnswer] = useState<any>(initialAnswer || '')
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    Array.isArray(initialAnswer) ? initialAnswer : []
  )
  const [scaleValue, setScaleValue] = useState<number>(initialAnswer || 0)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  const handleTextAnswer = () => {
    if (answer.trim()) {
      onAnswer(answer.trim())
    }
  }

  const handleMultipleChoice = (option: string) => {
    setAnswer(option)
    onAnswer(option)
  }

  const handleMultiSelect = (option: string) => {
    const newSelected = selectedOptions.includes(option)
      ? selectedOptions.filter((o) => o !== option)
      : [...selectedOptions, option]
    setSelectedOptions(newSelected)
  }

  const handleMultiSelectSubmit = () => {
    if (selectedOptions.length > 0) {
      onAnswer(selectedOptions)
    }
  }

  const handleScale = (value: number) => {
    setScaleValue(value)
    onAnswer(value)
  }

  const canSubmit = () => {
    if (!question.required) return true

    switch (question.type) {
      case 'text':
        return answer.trim().length > 0
      case 'multiSelect':
        return selectedOptions.length > 0
      case 'scale':
        return scaleValue > 0
      default:
        return true
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>
            {displayText}
            {showCursor && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>

        {isComplete && (
          <View style={styles.answerContainer}>
            {question.type === 'text' && (
              <>
                <TextInput
                  style={styles.textInput}
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder={question.placeholder || 'Type your answer...'}
                  placeholderTextColor="#999"
                  multiline
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleTextAnswer}
                />
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !canSubmit() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleTextAnswer}
                  disabled={!canSubmit()}
                >
                  <Text style={styles.submitButtonText}>Continue</Text>
                </TouchableOpacity>
              </>
            )}

            {question.type === 'multipleChoice' && question.options && (
              <View style={styles.optionsContainer}>
                {question.options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      answer === option && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleMultipleChoice(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        answer === option && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {question.type === 'multiSelect' && question.options && (
              <>
                <View style={styles.optionsContainer}>
                  {question.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        selectedOptions.includes(option) &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => handleMultiSelect(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedOptions.includes(option) &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !canSubmit() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleMultiSelectSubmit}
                  disabled={!canSubmit()}
                >
                  <Text style={styles.submitButtonText}>Continue</Text>
                </TouchableOpacity>
              </>
            )}

            {question.type === 'scale' && (
              <>
                <View style={styles.scaleContainer}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.scaleButton,
                        scaleValue === value && styles.scaleButtonSelected,
                      ]}
                      onPress={() => handleScale(value)}
                    >
                      <Text
                        style={[
                          styles.scaleText,
                          scaleValue === value && styles.scaleTextSelected,
                        ]}
                      >
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.scaleLabels}>
                  <Text style={styles.scaleLabel}>Not at all</Text>
                  <Text style={styles.scaleLabel}>Very much</Text>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {onSkip && isComplete && (
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  questionContainer: {
    marginBottom: 40,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 38,
  },
  cursor: {
    color: '#1a1a1a',
  },
  answerContainer: {
    marginTop: 20,
  },
  textInput: {
    fontSize: 18,
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.3,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  optionButtonSelected: {
    borderColor: '#667eea',
    backgroundColor: '#f0f0ff',
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  optionTextSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scaleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  scaleButtonSelected: {
    borderColor: '#667eea',
    backgroundColor: '#667eea',
  },
  scaleText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  scaleTextSelected: {
    color: 'white',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  scaleLabel: {
    fontSize: 14,
    color: '#999',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
})

export default OnboardingQuestion
