import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

interface WelcomeScreenProps {
  onGetStarted: () => void
  onLogin: () => void
}

const WelcomeScreen = ({ onGetStarted, onLogin }: WelcomeScreenProps) => {
  return (
    <ImageBackground
      source={require('../assets/images/constellation-bg.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Content */}
        <View style={styles.content}>
          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={styles.heyText}>Hey!</Text>
            <Text style={styles.titleText}>Meet Orin</Text>
          </View>

          {/* CTA Button */}
          <TouchableOpacity style={styles.ctaButton} onPress={onGetStarted}>
            <Text style={styles.ctaText}>claim your clarity</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Have an account? </Text>
            <TouchableOpacity onPress={onLogin}>
              <Text style={styles.loginLink}>Log In</Text>
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
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  textContainer: {
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 40,
  },
  heyText: {
    fontSize: 24,
    color: '#ffffff',
    opacity: 0.6,
    fontWeight: '300',
  },
  titleText: {
    fontSize: 42,
    color: '#ffffff',
    fontWeight: '700',
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.7,
  },
  loginLink: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
})

export default WelcomeScreen
