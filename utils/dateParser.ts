/**
 * Parse relative time phrases into ISO timestamps
 * Examples: "tomorrow morning", "next Tuesday", "2 days before deadline"
 */

/**
 * Parse relative date/time phrases to ISO timestamp
 */
export const parseResurfaceTiming = (
  timing: string,
  deadline?: string | null
): string | null => {
  try {
    // If it's already an ISO timestamp, return it
    if (timing.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return timing
    }

    const now = new Date()
    const lower = timing.toLowerCase()

    // Tomorrow variations
    if (lower.includes('tomorrow morning')) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      return tomorrow.toISOString()
    }

    if (lower.includes('tomorrow afternoon')) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(14, 0, 0, 0)
      return tomorrow.toISOString()
    }

    if (lower.includes('tomorrow evening')) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(18, 0, 0, 0)
      return tomorrow.toISOString()
    }

    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      return tomorrow.toISOString()
    }

    // Next week
    if (lower.includes('next week')) {
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      nextWeek.setHours(9, 0, 0, 0)
      return nextWeek.toISOString()
    }

    // In X days/hours
    const daysMatch = lower.match(/in (\d+) days?/)
    if (daysMatch) {
      const days = parseInt(daysMatch[1])
      const future = new Date(now)
      future.setDate(future.getDate() + days)
      future.setHours(9, 0, 0, 0)
      return future.toISOString()
    }

    const hoursMatch = lower.match(/in (\d+) hours?/)
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1])
      const future = new Date(now)
      future.setHours(future.getHours() + hours)
      return future.toISOString()
    }

    // Deadline-relative ("2 days before deadline")
    if (deadline && lower.includes('before deadline')) {
      const deadlineDate = new Date(deadline)
      const daysBeforeMatch = lower.match(/(\d+) days? before/)
      if (daysBeforeMatch) {
        const daysBefore = parseInt(daysBeforeMatch[1])
        deadlineDate.setDate(deadlineDate.getDate() - daysBefore)
        deadlineDate.setHours(9, 0, 0, 0)
        return deadlineDate.toISOString()
      }
    }

    // Day of week (next occurrence)
    const daysOfWeek = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lower.includes(daysOfWeek[i])) {
        const targetDay = i
        const currentDay = now.getDay()
        let daysUntil = targetDay - currentDay
        if (daysUntil <= 0) daysUntil += 7 // Next week
        const target = new Date(now)
        target.setDate(target.getDate() + daysUntil)
        target.setHours(9, 0, 0, 0)
        return target.toISOString()
      }
    }

    // Default fallback: tomorrow morning
    console.warn(`Could not parse resurface timing: "${timing}", defaulting to tomorrow morning`)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString()
  } catch (error) {
    console.error('Error parsing resurface timing:', error)
    return null
  }
}

/**
 * Get resurfacing schedule for a task based on deadline
 * Returns array of resurface times
 */
export const getTaskResurfaceSchedule = (deadline: string): string[] => {
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const schedule: string[] = []

  // 2 days before at 9am
  const twoDaysBefore = new Date(deadlineDate)
  twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
  twoDaysBefore.setHours(9, 0, 0, 0)
  if (twoDaysBefore > now) {
    schedule.push(twoDaysBefore.toISOString())
  }

  // Day of at 9am
  const dayOf = new Date(deadlineDate)
  dayOf.setHours(9, 0, 0, 0)
  if (dayOf > now) {
    schedule.push(dayOf.toISOString())
  }

  // 2 hours before
  const twoHoursBefore = new Date(deadlineDate)
  twoHoursBefore.setHours(twoHoursBefore.getHours() - 2)
  if (twoHoursBefore > now) {
    schedule.push(twoHoursBefore.toISOString())
  }

  return schedule
}

/**
 * Format a date for display
 */
export const formatRelativeDate = (isoString: string): string => {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
