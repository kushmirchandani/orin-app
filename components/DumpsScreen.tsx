import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

interface Dump {
  id: string
  title: string
  tags: { label: string; type: 'emotion' | 'category' }[]
  timestamp: string
  commentCount: number
  audioCount: number
  likeCount: number
}

const DumpsScreen = () => {
  const [activeTab, setActiveTab] = useState<'Journals' | 'Tasks' | 'Notes' | 'Ideas'>('Journals')
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data
  const dumps: { [key: string]: Dump[] } = {
    Today: [
      {
        id: '1',
        title: 'On Edge, All Day, Today!',
        tags: [
          { label: 'Anxious', type: 'emotion' },
          { label: '#anxiety', type: 'category' },
          { label: '#stress', type: 'category' },
        ],
        timestamp: 'Just now',
        commentCount: 0,
        audioCount: 1,
        likeCount: 0,
      },
      {
        id: '2',
        title: 'Tired but Hopeful Today',
        tags: [
          { label: 'Calm', type: 'emotion' },
          { label: '#work', type: 'category' },
          { label: '#self-reflection', type: 'category' },
        ],
        timestamp: 'Today, 9:07',
        commentCount: 2,
        audioCount: 1,
        likeCount: 2,
      },
    ],
    'This week': [
      {
        id: '3',
        title: 'The Silence Was Too Loud',
        tags: [
          { label: 'Lonely', type: 'emotion' },
          { label: '#isolation', type: 'category' },
          { label: '#solitude', type: 'category' },
        ],
        timestamp: 'Aug 8, 2025',
        commentCount: 2,
        audioCount: 1,
        likeCount: 0,
      },
      {
        id: '4',
        title: 'Small Wins Count',
        tags: [
          { label: 'Reflective', type: 'emotion' },
          { label: '#productivity', type: 'category' },
        ],
        timestamp: 'Aug 7, 2025',
        commentCount: 2,
        audioCount: 0,
        likeCount: 2,
      },
      {
        id: '5',
        title: 'The Idea Hit Me in Traffic',
        tags: [
          { label: 'Inspired', type: 'emotion' },
          { label: '#startupideas', type: 'category' },
        ],
        timestamp: 'Aug 6, 2025',
        commentCount: 2,
        audioCount: 1,
        likeCount: 0,
      },
    ],
    'Last week': [],
  }

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
        {Object.entries(dumps).map(([section, items]) => (
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
                    <Text style={styles.timestamp}>{dump.timestamp}</Text>
                    <View style={styles.stats}>
                      {dump.commentCount > 0 && (
                        <View style={styles.stat}>
                          <Ionicons name="chatbubble-outline" size={14} color="#999" />
                          <Text style={styles.statText}>{dump.commentCount}</Text>
                        </View>
                      )}
                      {dump.audioCount > 0 && (
                        <View style={styles.stat}>
                          <Ionicons name="mic" size={14} color="#999" />
                          <Text style={styles.statText}>{dump.audioCount}</Text>
                        </View>
                      )}
                      {dump.likeCount > 0 && (
                        <View style={styles.stat}>
                          <Ionicons name="heart-outline" size={14} color="#999" />
                          <Text style={styles.statText}>{dump.likeCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
})

export default DumpsScreen
