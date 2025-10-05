import { View, Text, TouchableOpacity, StyleSheet, Image, ImageBackground } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface OnboardingFinalScreenProps {
  onComplete: () => void
  onSkip: () => void
}

export default function OnboardingFinalScreen({ onComplete, onSkip }: OnboardingFinalScreenProps) {
  return (
    <ImageBackground
      source={require('../assets/images/onboarding-bg.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.card}>
            {/* Your Image */}
            <Image
              source={require('../assets/images/onboarding-final.png')}
              style={styles.image}
              resizeMode="cover"
            />

            {/* Buttons */}
            <TouchableOpacity
              style={styles.button}
              onPress={onComplete}
            >
              <Text style={styles.buttonText}>Open Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
            >
              <Text style={styles.skipText}>Skip & do later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    width: '100%',
    maxWidth: 400,
  },
  image: {
    width: '100%',
    height: 500,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
})
