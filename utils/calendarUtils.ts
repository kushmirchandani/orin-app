import * as Calendar from 'expo-calendar'

/**
 * Check if user has granted calendar permission
 */
export const hasCalendarPermission = async (): Promise<boolean> => {
  const { status } = await Calendar.getCalendarPermissionsAsync()
  return status === 'granted'
}

/**
 * Request calendar permission
 */
export const requestCalendarPermission = async (): Promise<boolean> => {
  const { status } = await Calendar.requestCalendarPermissionsAsync()
  return status === 'granted'
}

/**
 * Get all user's calendars
 */
export const getUserCalendars = async (): Promise<Calendar.Calendar[]> => {
  const hasPermission = await hasCalendarPermission()
  if (!hasPermission) {
    return []
  }

  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
    return calendars
  } catch (error) {
    console.error('Error fetching calendars:', error)
    return []
  }
}

/**
 * Check if user is currently busy (has an event right now)
 */
export const isUserBusy = async (): Promise<boolean> => {
  const hasPermission = await hasCalendarPermission()
  if (!hasPermission) {
    return false // Default to not busy if no permission
  }

  try {
    const calendars = await getUserCalendars()
    if (calendars.length === 0) {
      return false
    }

    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    // Get events happening right now (with 5 min buffer)
    const events = await Calendar.getEventsAsync(
      calendars.map(cal => cal.id),
      fiveMinutesAgo,
      fiveMinutesFromNow
    )

    // Filter out all-day events and declined events
    const activeEvents = events.filter(event => {
      // Skip all-day events
      if (event.allDay) return false

      // Skip if user declined (if status is available)
      if (event.status === 'CANCELLED') return false

      return true
    })

    return activeEvents.length > 0
  } catch (error) {
    console.error('Error checking if user is busy:', error)
    return false
  }
}

/**
 * Get user's busy times for a given date range
 * Returns array of {start, end} time ranges when user is busy
 */
export const getBusyTimes = async (
  startDate: Date,
  endDate: Date
): Promise<Array<{ start: Date; end: Date; title: string }>> => {
  const hasPermission = await hasCalendarPermission()
  if (!hasPermission) {
    return []
  }

  try {
    const calendars = await getUserCalendars()
    if (calendars.length === 0) {
      return []
    }

    const events = await Calendar.getEventsAsync(
      calendars.map(cal => cal.id),
      startDate,
      endDate
    )

    // Filter and map to busy times
    const busyTimes = events
      .filter(event => {
        // Skip all-day events
        if (event.allDay) return false
        // Skip cancelled events
        if (event.status === 'CANCELLED') return false
        return true
      })
      .map(event => ({
        start: new Date(event.startDate),
        end: new Date(event.endDate),
        title: event.title || 'Busy',
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    return busyTimes
  } catch (error) {
    console.error('Error getting busy times:', error)
    return []
  }
}

/**
 * Find the next free time slot for the user (minimum 15 minutes)
 * Searches within the next 8 hours
 */
export const getNextFreeTime = async (
  minDurationMinutes: number = 15
): Promise<Date | null> => {
  const hasPermission = await hasCalendarPermission()
  if (!hasPermission) {
    return new Date() // If no permission, assume user is free now
  }

  try {
    const now = new Date()
    const eightHoursFromNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)

    const busyTimes = await getBusyTimes(now, eightHoursFromNow)

    if (busyTimes.length === 0) {
      return now // User is free now
    }

    // Check if user is free right now
    const currentlyBusy = busyTimes.some(
      slot => slot.start <= now && slot.end > now
    )

    if (!currentlyBusy) {
      return now
    }

    // Find gaps between busy times
    for (let i = 0; i < busyTimes.length - 1; i++) {
      const currentEnd = busyTimes[i].end
      const nextStart = busyTimes[i + 1].start

      const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)

      if (gapMinutes >= minDurationMinutes) {
        return currentEnd
      }
    }

    // If no gaps found, return time after last event
    const lastEvent = busyTimes[busyTimes.length - 1]
    return lastEvent.end

  } catch (error) {
    console.error('Error finding next free time:', error)
    return new Date() // Default to now
  }
}

/**
 * Check if a specific time is during a busy period
 */
export const isTimeBusy = async (time: Date): Promise<boolean> => {
  const hasPermission = await hasCalendarPermission()
  if (!hasPermission) {
    return false
  }

  try {
    const calendars = await getUserCalendars()
    if (calendars.length === 0) {
      return false
    }

    const fiveMinutesBefore = new Date(time.getTime() - 5 * 60 * 1000)
    const fiveMinutesAfter = new Date(time.getTime() + 5 * 60 * 1000)

    const events = await Calendar.getEventsAsync(
      calendars.map(cal => cal.id),
      fiveMinutesBefore,
      fiveMinutesAfter
    )

    const activeEvents = events.filter(event => {
      if (event.allDay) return false
      if (event.status === 'CANCELLED') return false

      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)

      // Check if the time falls within this event
      return eventStart <= time && eventEnd > time
    })

    return activeEvents.length > 0
  } catch (error) {
    console.error('Error checking if time is busy:', error)
    return false
  }
}

/**
 * Get a summary of today's schedule
 */
export const getTodaySchedule = async (): Promise<{
  totalEvents: number
  busyHours: number
  freeHours: number
  nextEvent: Date | null
}> => {
  const hasPermission = await hasCalendarPermission()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  if (!hasPermission) {
    return {
      totalEvents: 0,
      busyHours: 0,
      freeHours: 24,
      nextEvent: null,
    }
  }

  try {
    const busyTimes = await getBusyTimes(todayStart, todayEnd)

    // Calculate total busy hours
    const totalBusyMinutes = busyTimes.reduce((total, slot) => {
      const durationMs = slot.end.getTime() - slot.start.getTime()
      const durationMinutes = durationMs / (1000 * 60)
      return total + durationMinutes
    }, 0)

    const busyHours = totalBusyMinutes / 60
    const freeHours = 24 - busyHours

    // Find next event
    const upcomingEvents = busyTimes.filter(slot => slot.start > now)
    const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0].start : null

    return {
      totalEvents: busyTimes.length,
      busyHours: Math.round(busyHours * 10) / 10,
      freeHours: Math.round(freeHours * 10) / 10,
      nextEvent,
    }
  } catch (error) {
    console.error('Error getting today schedule:', error)
    return {
      totalEvents: 0,
      busyHours: 0,
      freeHours: 24,
      nextEvent: null,
    }
  }
}
