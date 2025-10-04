import { View, StyleSheet, ImageBackground } from 'react-native'

const LaunchScreen = () => {
  return (
    <ImageBackground
      source={require('../assets/images/launch-screen.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.content} />
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
})

export default LaunchScreen
