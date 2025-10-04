import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { groupDumpsByPeriod, formatTimestamp } from '../utils/dumpUtils'

interface Dump {
  id: string
  title: string
  content: string
  type: 'voice' | 'writing'
  audio_url: string | null
  tags: { label: string; type: 'emotion' | 'category' }[]
  created_at: string
  category: 'Journals' | 'Tasks' | 'Notes' | 'Ideas'
}

const DumpsScreen = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'Journals' | 'Tasks' | 'Notes' | 'Ideas'>('Journals')
  const [searchQuery, setSearchQuery] = useState('')
  const [dumps, setDumps] = useState<Dump[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDumps()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('dumps-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dumps',
        },
        () => {
          fetchDumps()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTab, searchQuery])

  const fetchDumps = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) return

      let query = supabase
        .from('dumps')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('category', activeTab)
        .order('created_at', { ascending: false })

      // Apply search filter if there's a query
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching dumps:', error)
        return
      }

      setDumps(data || [])
    } catch (error) {
      console.error('Error fetching dumps:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupedDumps = groupDumpsByPeriod(dumps)

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabContainer}>
        {(['Journals', 'Tasks', 'Notes', 'Ideas'] as const).map((tab) => (
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
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#000" />
        </TouchableOpacity>
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : dumps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} yet</Text>
            <Text style={styles.emptySubtext}>
              Start dumping your thoughts to see them here
            </Text>
          </View>
        ) : (
          Object.entries(groupedDumps).map(([section, items]) => {
            if (items.length === 0) return null

            return (
              <View key={section} style={styles.section}>
                <Text style={styles.sectionTitle}>{section}</Text>
                <View style={styles.grid}>
                  {items.map((dump) => (
                    <TouchableOpacity key={dump.id} style={styles.card}>
                      <Text style={styles.cardTitle}>{dump.title}</Text>
                      <View style={styles.tagsContainer}>
                        {dump.tags.map((tag, index) => (
                          <View
                            key={index}
                            style={[
                              styles.tag,
                              tag.type === 'emotion' && styles.tagEmotion,
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagText,
                                tag.type === 'emotion' && styles.tagEmotionText,
                              ]}
                            >
                              {tag.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={styles.timestamp}>
                          {formatTimestamp(new Date(dump.created_at))}
                        </Text>
                        <View style={styles.stats}>
                          {dump.audio_url && (
                            <View style={styles.stat}>
                              <Ionicons name="mic" size={14} color="#999" />
                            </View>
                          )}
                          {dump.type === 'writing' && (
                            <View style={styles.stat}>
                              <Ionicons name="document-text-outline" size={14} color="#999" />
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  filterButton: {
    marginLeft: 'auto',
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
})

export default DumpsScreen
