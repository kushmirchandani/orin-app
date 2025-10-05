npx expo run:ios --device# Calendar Integration Guide

## Overview

Orin integrates with Apple Calendar (iOS) to understand when you're free vs busy, allowing it to send reminders and notifications at optimal times.

## Features

- **Read-only access** - Orin never modifies or creates calendar events
- **Smart timing** - SMS reminders and notifications sent only when you're free
- **Privacy-first** - Only checks busy/free status, doesn't read event details
- **Automatic detection** - Skips all-day events and cancelled meetings

## Setup

### For Users

1. During onboarding, you'll be prompted to enable calendar access
2. Tap "Enable Calendar Access"
3. Grant permission when iOS prompts you
4. That's it! Orin will now check your availability before sending reminders

### For Developers

The calendar integration is built with `expo-calendar` and includes utilities in `utils/calendarUtils.ts`.

## Available Functions

### Basic Functions

```typescript
import {
  hasCalendarPermission,
  requestCalendarPermission,
  isUserBusy,
  getNextFreeTime,
} from './utils/calendarUtils'

// Check if user has granted permission
const hasPermission = await hasCalendarPermission()

// Request permission
const granted = await requestCalendarPermission()

// Check if user is currently busy (in a meeting/event)
const busy = await isUserBusy()

// Find the next free time slot (minimum 15 minutes)
const freeTime = await getNextFreeTime(15)
```

### Advanced Functions

```typescript
import {
  getBusyTimes,
  isTimeBusy,
  getTodaySchedule,
  getUserCalendars,
} from './utils/calendarUtils'

// Get all busy time slots for a date range
const startDate = new Date()
const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
const busySlots = await getBusyTimes(startDate, endDate)
// Returns: [{ start: Date, end: Date, title: string }]

// Check if a specific time is during a busy period
const time = new Date(2025, 10, 5, 14, 30) // Oct 5, 2025 at 2:30 PM
const isBusy = await isTimeBusy(time)

// Get summary of today's schedule
const schedule = await getTodaySchedule()
// Returns: { totalEvents: number, busyHours: number, freeHours: number, nextEvent: Date | null }

// Get all user calendars
const calendars = await getUserCalendars()
```

## Usage Examples

### Example 1: Send SMS only when user is free

```typescript
import { isUserBusy } from './utils/calendarUtils'

const sendReminderSMS = async (userId: string, message: string) => {
  // Check if user is currently in a meeting
  const busy = await isUserBusy()

  if (busy) {
    console.log('User is busy, will retry later')
    // Schedule for next free time
    const nextFree = await getNextFreeTime()
    // ... schedule message for later
    return
  }

  // User is free, send SMS now
  await sendSMS(userId, message)
}
```

### Example 2: Find optimal time to send notification

```typescript
import { getNextFreeTime } from './utils/calendarUtils'

const scheduleNotification = async () => {
  // Find next 15-minute free slot
  const freeTime = await getNextFreeTime(15)

  if (freeTime) {
    console.log(`Next free time: ${freeTime.toLocaleString()}`)
    // Schedule notification for this time
  }
}
```

### Example 3: Show today's schedule in UI

```typescript
import { getTodaySchedule } from './utils/calendarUtils'

const TodayWidget = () => {
  const [schedule, setSchedule] = useState(null)

  useEffect(() => {
    const loadSchedule = async () => {
      const data = await getTodaySchedule()
      setSchedule(data)
    }
    loadSchedule()
  }, [])

  return (
    <View>
      <Text>Today: {schedule?.totalEvents} events</Text>
      <Text>Busy: {schedule?.busyHours}h</Text>
      <Text>Free: {schedule?.freeHours}h</Text>
    </View>
  )
}
```

## Integration with SMS

The proactive SMS Edge Function can be enhanced to check calendar availability:

```typescript
// In proactive-sms-check Edge Function
import { isUserBusy, getNextFreeTime } from './calendarUtils'

// Before sending SMS
const busy = await isUserBusy()

if (busy) {
  // User is in a meeting, find next free time
  const nextFree = await getNextFreeTime()
  // Schedule SMS for later
} else {
  // Send SMS now
  await sendSMS(user, message)
}
```

## Database Schema

Calendar permission status is stored in the `profiles` table:

```sql
ALTER TABLE profiles
ADD COLUMN calendar_enabled BOOLEAN DEFAULT false;
```

## Permissions

### iOS (Info.plist)

The following permissions are automatically handled by Expo:

```xml
<key>NSCalendarsUsageDescription</key>
<string>Orin needs access to your calendar to know when you're free, so we can send reminders at the perfect time.</string>
```

This is configured in `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCalendarsUsageDescription": "Orin needs access to your calendar to know when you're free, so we can send reminders at the perfect time."
      }
    }
  }
}
```

### Android

Calendar permissions are handled automatically by expo-calendar.

## Privacy & Security

- **Read-only**: Orin never creates, modifies, or deletes calendar events
- **Minimal data**: Only checks start/end times, not event titles or details
- **Local processing**: Calendar data is processed on-device
- **User control**: Users can revoke permission anytime in Settings
- **Respects availability**: All-day events and cancelled meetings are ignored

## Future Enhancements

Potential improvements for calendar integration:

1. **Google Calendar support** - Add support for Google Calendar on Android
2. **Work hours detection** - Learn user's typical work hours
3. **Focus time protection** - Detect "Focus" or "Do Not Disturb" events
4. **Smart scheduling** - Suggest best times for task completion based on free slots
5. **Calendar sync** - Optionally add tasks with deadlines to user's calendar

## Troubleshooting

### Permission not granted
- Check iOS Settings → Privacy → Calendars → Orin
- Ensure user tapped "Allow" when prompted

### Not detecting busy times
- Verify calendars are properly synced to device
- Check that events have start/end times (not all-day)
- Ensure calendar_enabled is true in profiles table

### Performance issues
- Calendar queries are cached for 5 minutes
- getBusyTimes is optimized for short date ranges (prefer < 7 days)
- Consider background refresh for better performance
