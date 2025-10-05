import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native'
import { Svg, Circle, Line, G } from 'react-native-svg'
import { supabase } from '../lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import { Gyroscope } from 'expo-sensors'
import { CameraView, useCameraPermissions } from 'expo-camera'

interface Thought {
  id: string
  thought_text: string
  type: string
  importance: string
  category: string
  sentiment: string
  created_at: string
}

interface ThoughtRelation {
  parent_thought_id: string
  child_thought_id: string
  relation: string
}

interface Star {
  id: string
  x: number
  y: number
  size: number
  color: string
  thought: Thought
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const MAP_WIDTH = SCREEN_WIDTH * 2
const MAP_HEIGHT = SCREEN_HEIGHT * 1.5

export default function MindMapScreen() {
  const [stars, setStars] = useState<Star[]>([])
  const [relations, setRelations] = useState<ThoughtRelation[]>([])
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null)
  const [gyroEnabled, setGyroEnabled] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  const offsetX = new Animated.Value(0)
  const offsetY = new Animated.Value(0)

  useEffect(() => {
    fetchThoughts()
  }, [])

  useEffect(() => {
    if (!gyroEnabled) return

    // Set up gyroscope
    Gyroscope.setUpdateInterval(16) // ~60fps

    const subscription = Gyroscope.addListener((data) => {
      // Use setValue for immediate updates without animation
      offsetX.setValue((offsetX as any)._value + data.y * 15)
      offsetY.setValue((offsetY as any)._value - data.x * 15)
    })

    return () => subscription && subscription.remove()
  }, [gyroEnabled])

  const fetchThoughts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch recent thoughts
    const { data: thoughts, error } = await supabase
      .from('thoughts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !thoughts) return

    // Fetch relations
    const thoughtIds = thoughts.map(t => t.id)
    const { data: relationsData } = await supabase
      .from('thought_relations')
      .select('*')
      .or(`parent_thought_id.in.(${thoughtIds.join(',')}),child_thought_id.in.(${thoughtIds.join(',')})`)

    if (relationsData) {
      setRelations(relationsData)
    }

    // Convert thoughts to stars with positions
    const starsData: Star[] = thoughts.map((thought, index) => {
      // Cluster by category
      const categoryHash = hashCode(thought.category || 'uncategorized')
      const baseX = (categoryHash % 5) * (MAP_WIDTH / 5) + MAP_WIDTH / 10
      const baseY = (Math.floor(categoryHash / 5) % 3) * (MAP_HEIGHT / 3) + MAP_HEIGHT / 6

      // Add some randomness
      const x = baseX + (Math.random() - 0.5) * 200
      const y = baseY + (Math.random() - 0.5) * 200

      return {
        id: thought.id,
        x,
        y,
        size: getSizeForImportance(thought.importance),
        color: getColorForType(thought.type),
        thought,
      }
    })

    setStars(starsData)
  }

  const hashCode = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  const getSizeForImportance = (importance: string): number => {
    switch (importance) {
      case 'high': return 12
      case 'medium': return 8
      case 'low': return 5
      default: return 6
    }
  }

  const getColorForType = (type: string): string => {
    const colors: { [key: string]: string } = {
      task: '#667eea',
      idea: '#f093fb',
      reminder: '#4facfe',
      reflection: '#43e97b',
      question: '#fa709a',
      event: '#feca57',
    }
    return colors[type] || '#ffffff'
  }


  const renderConstellationLines = () => {
    return relations.map((relation, index) => {
      const parent = stars.find(s => s.id === relation.parent_thought_id)
      const child = stars.find(s => s.id === relation.child_thought_id)

      if (!parent || !child) return null

      return (
        <Line
          key={`line-${index}`}
          x1={parent.x}
          y1={parent.y}
          x2={child.x}
          y2={child.y}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />
      )
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mind Map</Text>
        <View style={styles.headerRight}>
          <Text style={styles.subtitle}>{stars.length} thoughts</Text>
          <TouchableOpacity
            style={[styles.gyroButton, gyroEnabled && styles.gyroButtonActive]}
            onPress={async () => {
              if (!gyroEnabled && !permission?.granted) {
                await requestPermission()
              }
              setGyroEnabled(!gyroEnabled)
            }}
          >
            <Ionicons name="phone-portrait-outline" size={20} color={gyroEnabled ? '#fff' : '#667eea'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.skyContainer}>
        {gyroEnabled && permission?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="back">
            <Animated.View
              style={[
                styles.mapContainer,
                {
                  transform: [
                    { translateX: offsetX },
                    { translateY: offsetY },
                  ],
                },
              ]}
            >
              <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>
                <G>
                  {renderConstellationLines()}
                  {stars.map((star) => (
                    <Circle
                      key={star.id}
                      cx={star.x}
                      cy={star.y}
                      r={star.size}
                      fill={star.color}
                      opacity={0.9}
                      onPress={() => setSelectedThought(star.thought)}
                    />
                  ))}
                </G>
              </Svg>
            </Animated.View>
          </CameraView>
        ) : (
          <Animated.View
            style={[
              styles.mapContainer,
              {
                transform: [
                  { translateX: offsetX },
                  { translateY: offsetY },
                ],
              },
            ]}
          >
            <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>
              <G>
                {renderConstellationLines()}
                {stars.map((star) => (
                  <Circle
                    key={star.id}
                    cx={star.x}
                    cy={star.y}
                    r={star.size}
                    fill={star.color}
                    opacity={0.8}
                    onPress={() => setSelectedThought(star.thought)}
                  />
                ))}
              </G>
            </Svg>
          </Animated.View>
        )}
      </View>

      {/* Thought Detail Modal */}
      <Modal
        visible={selectedThought !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedThought(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedThought(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalType}>{selectedThought?.type}</Text>
              <TouchableOpacity onPress={() => setSelectedThought(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.modalText}>{selectedThought?.thought_text}</Text>
              <View style={styles.modalMeta}>
                <Text style={styles.metaLabel}>Category: {selectedThought?.category}</Text>
                <Text style={styles.metaLabel}>Importance: {selectedThought?.importance}</Text>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.hint}>
        {gyroEnabled ? 'Move your phone to explore • Tap stars to view' : 'Tap phone icon to enable motion control'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  gyroButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  gyroButtonActive: {
    backgroundColor: '#667eea',
  },
  skyContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  mapContainer: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    position: 'absolute',
    left: -MAP_WIDTH / 2 + SCREEN_WIDTH / 2,
    top: -MAP_HEIGHT / 2 + SCREEN_HEIGHT / 2,
  },
  hint: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    color: '#666',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    textTransform: 'uppercase',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  modalMeta: {
    marginTop: 16,
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: '#666',
  },
})
