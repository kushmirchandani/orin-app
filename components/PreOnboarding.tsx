import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface PreOnboardingProps {
  onComplete: () => void
}

const PreOnboarding = ({ onComplete }: PreOnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: "Welcome to Orin",
      description: "Your personal second mind, designed to help you stay organized and focused.",
      emoji: "🧠"
    },
    {
      title: "Capture Everything",
      description: "Quickly capture thoughts, tasks, and ideas before they slip away.",
      emoji: "✨"
    },
    {
      title: "Stay Focused",
      description: "Break down overwhelming tasks into manageable steps and stay on track.",
      emoji: "🎯"
    }
  ]

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  return (
    <LinearGradient
      colors={['#7B9FDB', '#5B6FBF', '#5F63B3']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        <View style={styles.slide}>
          <Text style={styles.emoji}>{slides[currentSlide].emoji}</Text>
          <Text style={styles.title}>{slides[currentSlide].title}</Text>
          <Text style={styles.description}>{slides[currentSlide].description}</Text>
        </View>

        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && styles.activeDot
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onComplete}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>
              {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 20,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeDot: {
    width: 30,
    backgroundColor: 'white',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  skipBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
  },
  skipText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  nextText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
  },
})

export default PreOnboarding
