import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Markdown from 'react-native-markdown-display'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

interface SuggestionCard {
  id: string
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  prompt: string
}

interface OrinAIChatProps {
  onClose: () => void
}

export default function OrinAIChat({ onClose }: OrinAIChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const flatListRef = useRef<FlatList>(null)

  // Debug: log user on mount
  useEffect(() => {
    console.log('OrinAIChat mounted, user from context:', user)
  }, [user])

  const suggestions: SuggestionCard[] = [
    {
      id: '1',
      icon: 'calendar-outline',
      title: 'UPCOMING TASKS',
      description: 'See what you need to do next',
      prompt: 'What tasks do I have coming up?',
    },
    {
      id: '2',
      icon: 'analytics-outline',
      title: 'ANALYZE MOOD',
      description: 'Get insights on your mental state',
      prompt: 'Analyze my thoughts from this past month',
    },
    {
      id: '3',
      icon: 'call-outline',
      title: 'WHO TO CONTACT',
      description: 'Find people you need to reach',
      prompt: 'Who am I supposed to call?',
    },
    {
      id: '4',
      icon: 'briefcase-outline',
      title: 'WORK NOTES',
      description: 'Review your work-related thoughts',
      prompt: 'Show me my work-related notes',
    },
  ]

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages])

  const handleSend = async (customPrompt?: string) => {
    const messageText = customPrompt || inputText.trim()
    if (!messageText || isLoading) return

    setShowSuggestions(false)

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      // Get current user ID
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      console.log('Current user from supabase:', currentUser?.id)

      if (!currentUser) {
        throw new Error('No user found')
      }

      // Get all user's thoughts (skip vector search for now since embeddings don't exist)
      console.log('Fetching thoughts for user:', currentUser.id)
      const { data: allThoughts, error: thoughtsError } = await supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(200)

      console.log('Query returned:', allThoughts?.length, 'thoughts')
      if (allThoughts && allThoughts.length > 0) {
        console.log('First 3 thoughts:', allThoughts.slice(0, 3).map(t => t.thought_text))
      }

      const thoughtsContext = (allThoughts || [])
        .map(
          (t) =>
            `[${t.type}] ${t.thought_text}${t.deadline ? ` (due: ${t.deadline})` : ''}${
              t.category ? ` [${t.category}]` : ''
            }`
        )
        .join('\n')

      console.log('thoughtsContext length:', thoughtsContext.length)

      // Call OpenAI via edge function
      console.log('Calling orin-chat function...')
      console.log('Sending question:', messageText)
      console.log('Thoughts context preview:', thoughtsContext.substring(0, 500) + '...')
      console.log('Total thoughts in context:', thoughtsContext.split('\n').length)

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/orin-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            question: messageText,
            thoughtsContext,
          }),
        }
      )

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || data.error || 'Sorry, I had trouble processing that. Please try again.',
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error('Error getting AI response:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        {item.isUser ? (
          <Text style={[styles.messageText, styles.userText]}>
            {item.text}
          </Text>
        ) : (
          <Markdown
            style={{
              body: { color: '#000', fontSize: 16, lineHeight: 22 },
              paragraph: { marginTop: 0, marginBottom: 8 },
              strong: { fontWeight: '700' },
              em: { fontStyle: 'italic' },
              list_item: { marginBottom: 4 },
            }}
          >
            {item.text}
          </Markdown>
        )}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Suggestions View or Messages */}
      {showSuggestions ? (
        <ScrollView style={styles.suggestionsContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.mainTitle}>
            Ask your mind{'\n'}anything or explore{'\n'}<Text style={styles.highlightText}>personalized insights</Text>
          </Text>

          <View style={styles.cardsContainer}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion.id}
                style={[
                  styles.suggestionCard,
                  index % 2 === 0 ? styles.cardLeft : styles.cardRight,
                ]}
                onPress={() => handleSend(suggestion.prompt)}
              >
                <Ionicons name={suggestion.icon} size={32} color="#000" />
                <Text style={styles.cardTitle}>{suggestion.title}</Text>
                <Text style={styles.cardDescription}>{suggestion.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#667eea" />
              <Text style={styles.loadingText}>Orin is thinking...</Text>
            </View>
          )}
        </>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Write your thoughts here"
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => handleSend()}
            />
          </View>
          <TouchableOpacity
            onPress={() => handleSend()}
            style={styles.sendButton}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 32,
    lineHeight: 40,
  },
  highlightText: {
    color: '#667eea',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '47%',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLeft: {},
  cardRight: {},
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#000',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#000',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    maxHeight: 80,
    paddingVertical: 8,
  },
  micButton: {
    padding: 4,
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
})
