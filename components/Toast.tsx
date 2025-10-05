import { useEffect } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface ToastProps {
  visible: boolean
  message: string
  type?: 'success' | 'error' | 'info'
  onHide?: () => void
}

const Toast = ({ visible, message, type = 'success', onHide }: ToastProps) => {
  const opacity = new Animated.Value(0)

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onHide) onHide()
        })
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!visible) return null

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle'
      case 'error':
        return 'alert-circle'
      case 'info':
        return 'information-circle'
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#34C759'
      case 'error':
        return '#FF3B30'
      case 'info':
        return '#667eea'
    }
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, backgroundColor: getBackgroundColor() }
      ]}
    >
      <Ionicons name={getIconName()} size={24} color="#fff" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
})

export default Toast
