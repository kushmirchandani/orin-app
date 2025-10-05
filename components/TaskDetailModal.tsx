import { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

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
  subtasks: Array<{ text: string; order: number; completed?: boolean }> | null
}

interface Subtask {
  id: string
  thought_text: string
  status: 'open' | 'done' | 'snoozed'
}

interface TaskDetailModalProps {
  visible: boolean
  task: Task | null
  onClose: () => void
  onUpdate: () => void
}

const TaskDetailModal = ({ visible, task, onClose, onUpdate }: TaskDetailModalProps) => {
  const [importance, setImportance] = useState(task?.importance || 'medium')
  const [timeNeeded, setTimeNeeded] = useState(task?.time_needed_minutes?.toString() || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)

  useEffect(() => {
    if (task && visible) {
      fetchSubtasks()
    }
  }, [task?.id, visible])

  const fetchSubtasks = async () => {
    if (!task) return

    try {
      setLoadingSubtasks(true)
      // Query thought_relations to find subtasks
      const { data: relations, error: relationsError } = await supabase
        .from('thought_relations')
        .select('child_thought_id')
        .eq('parent_thought_id', task.id)
        .eq('relation', 'subtask')

      if (relationsError) throw relationsError

      if (relations && relations.length > 0) {
        // Fetch the subtask thoughts
        const subtaskIds = relations.map(r => r.child_thought_id)
        const { data: subtaskThoughts, error: thoughtsError } = await supabase
          .from('thoughts')
          .select('id, thought_text, status')
          .in('id', subtaskIds)
          .order('created_at', { ascending: true })

        if (thoughtsError) throw thoughtsError

        setSubtasks(subtaskThoughts || [])
      } else {
        setSubtasks([])
      }
    } catch (error) {
      console.error('Error fetching subtasks:', error)
    } finally {
      setLoadingSubtasks(false)
    }
  }

  if (!task) return null

  const handleMarkComplete = async () => {
    try {
      setIsUpdating(true)
      const { error } = await supabase
        .from('thoughts')
        .update({ status: 'done' })
        .eq('id', task.id)

      if (error) throw error

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error marking task complete:', error)
      Alert.alert('Error', 'Failed to update task')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateTask = async () => {
    try {
      setIsUpdating(true)
      const { error } = await supabase
        .from('thoughts')
        .update({
          importance,
          time_needed_minutes: timeNeeded ? parseInt(timeNeeded) : null,
        })
        .eq('id', task.id)

      if (error) throw error

      onUpdate()
      Alert.alert('Success', 'Task updated')
    } catch (error) {
      console.error('Error updating task:', error)
      Alert.alert('Error', 'Failed to update task')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'done' ? 'open' : 'done'
      const { error } = await supabase
        .from('thoughts')
        .update({ status: newStatus })
        .eq('id', subtaskId)

      if (error) throw error

      // Update local state
      setSubtasks(subtasks.map(st =>
        st.id === subtaskId ? { ...st, status: newStatus as 'open' | 'done' | 'snoozed' } : st
      ))
    } catch (error) {
      console.error('Error toggling subtask:', error)
      Alert.alert('Error', 'Failed to update subtask')
    }
  }

  const getPriorityColor = () => {
    switch (importance) {
      case 'high':
        return '#FF3B30'
      case 'medium':
        return '#FF9500'
      case 'low':
        return '#34C759'
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Task Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Task Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Task</Text>
              {task.next_action && (
                <Text style={styles.nextAction}>{task.next_action}</Text>
              )}
              <Text style={styles.thoughtText}>{task.thought_text}</Text>
            </View>

            {/* Priority */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Priority</Text>
              <View style={styles.priorityButtons}>
                {(['high', 'medium', 'low'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.priorityButton,
                      importance === level && styles.priorityButtonActive,
                      importance === level && { borderColor: getPriorityColor() },
                    ]}
                    onPress={() => setImportance(level)}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        importance === level && { color: getPriorityColor() },
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Needed */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estimated Time (minutes)</Text>
              <TextInput
                style={styles.input}
                value={timeNeeded}
                onChangeText={setTimeNeeded}
                placeholder="e.g., 30"
                keyboardType="number-pad"
              />
            </View>

            {/* Subtasks - from JSONB column */}
            {task.subtasks && task.subtasks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.subtaskHeader}>
                  <Text style={styles.sectionTitle}>
                    Break it down ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})
                  </Text>
                  <Text style={styles.subtaskHint}>Start with step 1!</Text>
                </View>
                {task.subtasks
                  .sort((a, b) => a.order - b.order)
                  .map((subtask, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.subtaskRow}
                      onPress={async () => {
                        // Toggle completion in JSONB
                        const updatedSubtasks = task.subtasks!.map((st, i) =>
                          i === index ? { ...st, completed: !st.completed } : st
                        )
                        try {
                          const { error } = await supabase
                            .from('thoughts')
                            .update({ subtasks: updatedSubtasks })
                            .eq('id', task.id)
                          if (error) throw error
                          onUpdate()
                        } catch (error) {
                          console.error('Error updating subtask:', error)
                          Alert.alert('Error', 'Failed to update subtask')
                        }
                      }}
                    >
                      <View style={styles.subtaskLeft}>
                        <View style={[
                          styles.subtaskCheckbox,
                          subtask.completed && styles.subtaskCheckboxChecked
                        ]}>
                          {subtask.completed && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </View>
                        <View style={[
                          styles.subtaskNumber,
                          index === 0 && styles.subtaskNumberFirst
                        ]}>
                          <Text style={[
                            styles.subtaskNumberText,
                            index === 0 && styles.subtaskNumberTextFirst
                          ]}>{index + 1}</Text>
                        </View>
                        <Text style={[
                          styles.subtaskText,
                          subtask.completed && styles.subtaskTextDone,
                          index === 0 && styles.subtaskTextFirst
                        ]}>
                          {subtask.text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            {/* Subtasks - from relations table (legacy) */}
            {subtasks.length > 0 && (!task.subtasks || task.subtasks.length === 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subtasks ({subtasks.filter(st => st.status === 'done').length}/{subtasks.length})</Text>
                {subtasks.map((subtask, index) => (
                  <TouchableOpacity
                    key={subtask.id}
                    style={styles.subtaskRow}
                    onPress={() => handleToggleSubtask(subtask.id, subtask.status)}
                  >
                    <View style={styles.subtaskLeft}>
                      <View style={[
                        styles.subtaskCheckbox,
                        subtask.status === 'done' && styles.subtaskCheckboxChecked
                      ]}>
                        {subtask.status === 'done' && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                      <View style={styles.subtaskNumber}>
                        <Text style={styles.subtaskNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={[
                        styles.subtaskText,
                        subtask.status === 'done' && styles.subtaskTextDone
                      ]}>
                        {subtask.thought_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Metadata */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              {task.deadline && (
                <View style={styles.metadataRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.metadataText}>
                    Due: {new Date(task.deadline).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {task.category && (
                <View style={styles.metadataRow}>
                  <Ionicons name="pricetag-outline" size={16} color="#666" />
                  <Text style={styles.metadataText}>{task.category}</Text>
                </View>
              )}
              <View style={styles.metadataRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.metadataText}>
                  Created: {new Date(task.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdateTask}
              disabled={isUpdating}
            >
              <Text style={styles.updateButtonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleMarkComplete}
              disabled={isUpdating}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.completeButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextAction: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  thoughtText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#f9f9f9',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'capitalize',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#000',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  updateButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  subtaskRow: {
    marginBottom: 12,
  },
  subtaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskCheckboxChecked: {
    backgroundColor: '#667eea',
  },
  subtaskNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  subtaskText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  subtaskTextDone: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  subtaskHeader: {
    marginBottom: 12,
  },
  subtaskHint: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
    marginTop: 4,
  },
  subtaskNumberFirst: {
    backgroundColor: '#34C759',
  },
  subtaskNumberTextFirst: {
    color: '#fff',
  },
  subtaskTextFirst: {
    fontWeight: '600',
  },
})

export default TaskDetailModal
