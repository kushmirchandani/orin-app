import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import { supabase } from '../lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import TaskDetailModal from './TaskDetailModal'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface Thought {
  id: string
  thought_text: string
  type: string
  importance: 'high' | 'medium' | 'low'
  deadline: string | null
  time_needed_minutes: number | null
  category: string
  status: 'open' | 'done' | 'snoozed'
  created_at: string
  subtasks: Array<{ text: string; order: number; completed?: boolean }> | null
}

interface CategoryCluster {
  name: string
  count: number
  color: string
  icon: string
}

export default function BrainDashboard() {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [focusNow, setFocusNow] = useState<Thought[]>([])
  const [clusters, setClusters] = useState<CategoryCluster[]>([])
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null)
  const [weeklyStats, setWeeklyStats] = useState({ ideas: 0, tasks: 0, completed: 0 })

  useEffect(() => {
    fetchData()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('thoughts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thoughts',
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch all open thoughts
    const { data: thoughtsData } = await supabase
      .from('thoughts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (thoughtsData) {
      setThoughts(thoughtsData)

      // Calculate Focus Now items
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const priorityItems = thoughtsData.filter(t => {
        if (t.type !== 'task') return false

        // Overdue
        if (t.deadline && new Date(t.deadline) < now) return true

        // Due today
        if (t.deadline && new Date(t.deadline) <= new Date(today.getTime() + 24 * 60 * 60 * 1000)) return true

        // Quick wins (< 15 min)
        if (t.time_needed_minutes && t.time_needed_minutes <= 15) return true

        // High importance
        if (t.importance === 'high') return true

        return false
      }).slice(0, 5)

      setFocusNow(priorityItems)

      // Calculate clusters
      const categoryMap = new Map<string, number>()
      thoughtsData.forEach(t => {
        const cat = t.category || 'Uncategorized'
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
      })

      const clusterColors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#feca57']
      const clusterIcons = ['briefcase-outline', 'home-outline', 'bulb-outline', 'heart-outline', 'fitness-outline', 'book-outline']

      const clustersData = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count], index) => ({
          name,
          count,
          color: clusterColors[index],
          icon: clusterIcons[index],
        }))

      setClusters(clustersData)
    }

    // Calculate weekly stats
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: weeklyData } = await supabase
      .from('thoughts')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', weekAgo.toISOString())

    if (weeklyData) {
      setWeeklyStats({
        ideas: weeklyData.filter(t => t.type === 'idea').length,
        tasks: weeklyData.filter(t => t.type === 'task').length,
        completed: weeklyData.filter(t => t.status === 'done').length,
      })
    }
  }

  const getPriorityLabel = (thought: Thought) => {
    const now = new Date()
    if (thought.deadline && new Date(thought.deadline) < now) return 'Overdue'
    if (thought.time_needed_minutes && thought.time_needed_minutes <= 15) return 'Quick Win'
    if (thought.importance === 'high') return 'High Priority'
    return 'Due Today'
  }

  const getPriorityColor = (thought: Thought) => {
    const now = new Date()
    if (thought.deadline && new Date(thought.deadline) < now) return '#FF3B30'
    if (thought.time_needed_minutes && thought.time_needed_minutes <= 15) return '#34C759'
    if (thought.importance === 'high') return '#FF9500'
    return '#667eea'
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Brain</Text>
        <Text style={styles.subtitle}>Your mental command center</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Focus Now Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={20} color="#667eea" />
            <Text style={styles.sectionTitle}>Focus Now</Text>
          </View>
          {focusNow.length > 0 ? (
            focusNow.map(thought => (
              <TouchableOpacity
                key={thought.id}
                style={styles.focusCard}
                onPress={() => setSelectedThought(thought)}
              >
                <View style={styles.focusCardLeft}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(thought) }]}>
                    <Text style={styles.priorityText}>{getPriorityLabel(thought)}</Text>
                  </View>
                  <Text style={styles.focusCardTitle}>{thought.thought_text}</Text>
                  <View style={styles.focusCardBottom}>
                    {thought.time_needed_minutes && (
                      <Text style={styles.focusCardMeta}>~{thought.time_needed_minutes} min</Text>
                    )}
                    {thought.subtasks && thought.subtasks.length > 0 && (
                      <View style={styles.subtaskIndicator}>
                        <Ionicons name="list-outline" size={14} color="#667eea" />
                        <Text style={styles.subtaskIndicatorText}>
                          {thought.subtasks.filter(st => st.completed).length}/{thought.subtasks.length} steps
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#34C759" />
              <Text style={styles.emptyText}>All caught up!</Text>
            </View>
          )}
        </View>

        {/* Thought Clusters Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="albums" size={20} color="#667eea" />
            <Text style={styles.sectionTitle}>Thought Clusters</Text>
          </View>
          <View style={styles.clustersGrid}>
            {clusters.map((cluster, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.clusterCard, { borderColor: cluster.color }]}
              >
                <Ionicons name={cluster.icon as any} size={32} color={cluster.color} />
                <Text style={styles.clusterCount}>{cluster.count}</Text>
                <Text style={styles.clusterName}>{cluster.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Insights Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color="#667eea" />
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{weeklyStats.ideas}</Text>
              <Text style={styles.statLabel}>Ideas Captured</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{weeklyStats.tasks}</Text>
              <Text style={styles.statLabel}>Tasks Added</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{weeklyStats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {selectedThought && (
        <TaskDetailModal
          task={selectedThought}
          visible={!!selectedThought}
          onClose={() => setSelectedThought(null)}
          onUpdate={fetchData}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  focusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  focusCardLeft: {
    flex: 1,
  },
  focusCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  subtaskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subtaskIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  focusCardTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  focusCardMeta: {
    fontSize: 13,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  clustersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  clusterCard: {
    width: (SCREEN_WIDTH - 64) / 2,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clusterCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  clusterName: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
})
