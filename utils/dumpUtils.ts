/**
 * Utility functions for processing dumps (journal entries, notes, etc.)
 */

/**
 * Generate a title from content
 * Takes the first sentence or first 50 characters
 */
export const generateTitle = (content: string): string => {
  if (!content || content.trim().length === 0) {
    return 'Untitled Entry'
  }

  const trimmed = content.trim()

  // Try to get first sentence (ending with . ! or ?)
  const sentenceMatch = trimmed.match(/^[^.!?]+[.!?]/)
  if (sentenceMatch) {
    return sentenceMatch[0].trim()
  }

  // Otherwise, take first 50 characters
  if (trimmed.length > 50) {
    return trimmed.substring(0, 50).trim() + '...'
  }

  return trimmed
}

/**
 * Format timestamp for display
 */
export const formatTimestamp = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  if (hours < 24) {
    return `${hours}h ago`
  }
  if (days < 7) {
    if (days === 0) {
      return 'Today'
    }
    if (days === 1) {
      return 'Yesterday'
    }
    return `${days}d ago`
  }

  // For older dates, show the actual date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Group dumps by time periods
 */
export const groupDumpsByPeriod = (dumps: any[]) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  const groups: { [key: string]: any[] } = {
    Today: [],
    'This week': [],
    'Last week': [],
  }

  dumps.forEach(dump => {
    const dumpDate = new Date(dump.created_at)

    if (dumpDate >= today) {
      groups.Today.push(dump)
    } else if (dumpDate >= weekAgo) {
      groups['This week'].push(dump)
    } else if (dumpDate >= twoWeeksAgo) {
      groups['Last week'].push(dump)
    }
  })

  return groups
}

/**
 * Extract potential tags from content (simple keyword extraction)
 * This is a placeholder - in production, you'd use AI/ML for this
 */
export const extractTags = (content: string): { label: string; type: 'emotion' | 'category' }[] => {
  const emotions = [
    'happy', 'sad', 'anxious', 'calm', 'excited', 'tired', 'stressed',
    'peaceful', 'frustrated', 'hopeful', 'lonely', 'grateful', 'inspired',
    'worried', 'confident', 'overwhelmed', 'reflective', 'motivated'
  ]

  const tags: { label: string; type: 'emotion' | 'category' }[] = []
  const lowerContent = content.toLowerCase()

  // Check for emotions
  emotions.forEach(emotion => {
    if (lowerContent.includes(emotion)) {
      tags.push({
        label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        type: 'emotion'
      })
    }
  })

  // Extract hashtags
  const hashtagMatches = content.match(/#[\w-]+/g)
  if (hashtagMatches) {
    hashtagMatches.forEach(hashtag => {
      tags.push({
        label: hashtag,
        type: 'category'
      })
    })
  }

  return tags
}
