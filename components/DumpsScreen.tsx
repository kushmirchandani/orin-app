import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { groupDumpsByPeriod, formatTimestamp } from '../utils/dumpUtils'
import TaskDetailModal from './TaskDetailModal'
import { Swipeable } from 'react-native-gesture-handler'

interface MindDump {
  id: string
  user_id: string
  created_at: string
  source: 'voice' | 'text' | 'import'
  raw_text: string
  audio_url: string | null
  processed: boolean
  model_version: string | null
}

interface Task {
  id: string
  thought_text: string
  type: string
  importance: 'high' | 'medium' | 'low'
  deadline: string | null
  time_needed_minutes: number | null
  category: string
  next_action: string | null
  sentiment: string
  status: 'open' | 'done' | 'snoozed'
  created_at: string
}

const DumpsScreen = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'Journals' | 'Tasks' | 'Notes'>('Tasks')
  const [searchQuery, setSearchQuery] = useState('')
  const [mindDumps, setMindDumps] = useState<MindDump[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)

  useEffect(() => {
    if (activeTab === 'Tasks') {
      fetchTasks()
    } else if (activeTab === 'Journals') {
      fetchMindDumps()
    } else if (activeTab === 'Notes') {
      fetchNotes()
    }

    // Subscribe to real-time changes
    const tableName = activeTab === 'Journals' ? 'mind_dumps' : 'thoughts'
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        () => {
          if (activeTab === 'Tasks') {
            fetchTasks()
          } else if (activeTab === 'Journals') {
            fetchMindDumps()
          } else if (activeTab === 'Notes') {
            fetchNotes()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTab, searchQuery])

  const fetchTasks = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) return

      let query = supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', currentUser.id)
        .in('type', ['task', 'reminder'])
        .eq('status', 'open')
        .order('deadline', { ascending: true, nullsLast: true })

      // Apply search filter if there's a query
      if (searchQuery.trim()) {
        query = query.ilike('thought_text', `%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching tasks:', error)
        return
      }

      // Sort by importance: high -> medium -> low
      const sorted = (data || []).sort((a, b) => {
        const importanceOrder = { high: 0, medium: 1, low: 2 }
        return importanceOrder[a.importance] - importanceOrder[b.importance]
      })

      setTasks(sorted)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMindDumps = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) return

      let query = supabase
        .from('mind_dumps')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      // Apply search filter if there's a query
      if (searchQuery.trim()) {
        query = query.ilike('raw_text', `%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching mind dumps:', error)
        return
      }

      setMindDumps(data || [])
    } catch (error) {
      console.error('Error fetching mind dumps:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) return

      let query = supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', currentUser.id)
        .in('type', ['reflection', 'question', 'idea'])
        .order('created_at', { ascending: false })

      // Apply search filter if there's a query
      if (searchQuery.trim()) {
        query = query.ilike('thought_text', `%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notes:', error)
        return
      }

      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkDone = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('thoughts')
        .update({ status: 'done' })
        .eq('id', taskId)

      if (error) throw error

      // Refresh tasks list
      fetchTasks()
    } catch (error) {
      console.error('Error marking task as done:', error)
    }
  }

  const handleDeleteThought = async (thoughtId: string) => {
    try {
      const { error } = await supabase
        .from('thoughts')
        .delete()
        .eq('id', thoughtId)

      if (error) throw error

      // Refresh appropriate list
      if (activeTab === 'Tasks') {
        fetchTasks()
      } else if (activeTab === 'Notes') {
        fetchNotes()
      }
    } catch (error) {
      console.error('Error deleting thought:', error)
    }
  }

  const renderRightActions = (taskId: string) => {
    return (
      <TouchableOpacity
        style={styles.swipeActionComplete}
        onPress={() => handleMarkDone(taskId)}
      >
        <Ionicons name="checkmark-circle" size={28} color="#fff" />
        <Text style={styles.swipeActionText}>Complete</Text>
      </TouchableOpacity>
    )
  }

  const renderLeftActions = (thoughtId: string) => {
    return (
      <TouchableOpacity
        style={styles.swipeActionDelete}
        onPress={() => handleDeleteThought(thoughtId)}
      >
        <Ionicons name="trash" size={28} color="#fff" />
        <Text style={styles.swipeActionText}>Delete</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.fullContainer}>
      {/* Top Tabs */}
      <View style={styles.tabContainer}>
        {(['Tasks', 'Notes', 'Journals'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for any journal"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Ionicons name="search" size={24} color="#999" style={styles.searchIcon} />
      </View>

      {/* Content */}
      {activeTab === 'Tasks' ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>
                Dump your thoughts and tasks will be extracted automatically
              </Text>
            </View>
          ) : (
            <View style={styles.tasksContainer}>
              {tasks.map((task) => (
                <Swipeable
                  key={task.id}
                  renderRightActions={() => renderRightActions(task.id)}
                  renderLeftActions={() => renderLeftActions(task.id)}
                  overshootRight={false}
                  overshootLeft={false}
                >
                  <TouchableOpacity
                    style={[
                      styles.taskCard,
                      task.importance === 'high' && styles.taskCardHigh,
                      task.importance === 'medium' && styles.taskCardMedium,
                      task.importance === 'low' && styles.taskCardLow,
                    ]}
                    onPress={() => {
                      setSelectedTask(task)
                      setShowTaskModal(true)
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.taskHeaderRow}>
                      {task.next_action && (
                        <Text style={styles.taskTitle}>
                          {task.next_action}
                        </Text>
                      )}
                      {task.time_needed_minutes && (
                        <Text style={styles.timeNeeded}>{task.time_needed_minutes}m</Text>
                      )}
                    </View>
                    <Text style={styles.taskText}>
                      {task.thought_text}
                    </Text>
                    <View style={styles.taskFooter}>
                      {task.deadline && (
                        <View style={styles.deadlineContainer}>
                          <Ionicons name="calendar-outline" size={14} color="#FF3B30" />
                          <Text style={styles.deadline}>
                            {new Date(task.deadline).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      {task.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>{task.category}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </View>
          )}
        </ScrollView>
      ) : activeTab === 'Notes' ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bulb-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptySubtext}>
                Reflections, ideas, and questions will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.tasksContainer}>
              {notes.map((note) => (
                <Swipeable
                  key={note.id}
                  renderLeftActions={() => renderLeftActions(note.id)}
                  overshootLeft={false}
                >
                  <View style={styles.noteCard}>
                    <Text style={styles.noteText}>{note.thought_text}</Text>
                    <View style={styles.noteFooter}>
                      <Text style={styles.noteType}>{note.type}</Text>
                      {note.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>{note.category}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Swipeable>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : mindDumps.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No journals yet</Text>
              <Text style={styles.emptySubtext}>
                Start dumping your thoughts to see them here
              </Text>
            </View>
          ) : (
            <View style={styles.mindDumpsContainer}>
              {mindDumps.map((dump) => (
                <TouchableOpacity key={dump.id} style={styles.mindDumpCard}>
                  <View style={styles.mindDumpHeader}>
                    <Text style={styles.mindDumpTimestamp}>
                      {formatTimestamp(new Date(dump.created_at))}
                    </Text>
                    {dump.audio_url && (
                      <Ionicons name="mic" size={16} color="#999" />
                    )}
                  </View>
                  <Text style={styles.mindDumpText} numberOfLines={4}>
                    {dump.raw_text}
                  </Text>
                  {dump.processed && (
                    <View style={styles.processedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#34C759" />
                      <Text style={styles.processedText}>Processed</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        visible={showTaskModal}
        task={selectedTask}
        onClose={() => {
          setShowTaskModal(false)
          setSelectedTask(null)
        }}
        onUpdate={() => {
          fetchTasks()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 60,
    backgroundColor: '#fff',
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#F0F0F0',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 16,
  },
  searchIcon: {
    position: 'absolute',
    right: 32,
    top: 28,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  tagEmotion: {
    backgroundColor: '#E3EFFF',
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  tagEmotionText: {
    color: '#0066FF',
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  // Task styles
  tasksContainer: {
    padding: 20,
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    paddingVertical: 14,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardHigh: {
    borderLeftColor: '#FF3B30',
  },
  taskCardMedium: {
    borderLeftColor: '#FFB800',
  },
  taskCardLow: {
    borderLeftColor: '#34C759',
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  timeNeeded: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    lineHeight: 22,
    flex: 1,
    marginRight: 8,
  },
  taskText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadline: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  // Mind dump styles
  mindDumpsContainer: {
    padding: 20,
    gap: 12,
  },
  mindDumpCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mindDumpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mindDumpTimestamp: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  mindDumpText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
    marginBottom: 10,
  },
  processedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  processedText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  noteType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#667eea',
    textTransform: 'capitalize',
  },
  noteText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  // Swipe action styles
  swipeActionComplete: {
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    borderRadius: 16,
    marginBottom: 12,
  },
  swipeActionDelete: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    borderRadius: 16,
    marginBottom: 12,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
})

export default DumpsScreen
