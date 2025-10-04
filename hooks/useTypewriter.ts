import { useState, useEffect } from 'react'

interface UseTypewriterOptions {
  text: string
  speed?: number
  delay?: number
}

export const useTypewriter = ({ text, speed = 50, delay = 0 }: UseTypewriterOptions) => {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    // Reset when text changes
    setDisplayText('')
    setCurrentIndex(0)
    setIsComplete(false)
    setHasStarted(false)
  }, [text])

  useEffect(() => {
    if (!hasStarted && delay > 0) {
      const delayTimeout = setTimeout(() => {
        setHasStarted(true)
      }, delay)
      return () => clearTimeout(delayTimeout)
    } else if (!hasStarted && delay === 0) {
      setHasStarted(true)
    }
  }, [delay, hasStarted])

  useEffect(() => {
    if (hasStarted && currentIndex < text.length) {
      // Add natural variation to typing speed
      const randomVariation = Math.random() * 40 - 20 // -20 to +20ms variation
      const naturalSpeed = speed + randomVariation

      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, naturalSpeed)

      return () => clearTimeout(timeout)
    } else if (hasStarted && currentIndex === text.length && text.length > 0) {
      setIsComplete(true)
    }
  }, [currentIndex, text, speed, hasStarted])

  return { displayText, isComplete }
}
