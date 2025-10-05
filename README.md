# Orin - Your Mental Command Center

Orin is a mobile app that helps you capture, organize, and act on your thoughts. Using voice or text, dump your mind and let Orin intelligently categorize your tasks, ideas, and reflections.

## Features

- 🎤 **Voice & Text Capture** - Record your thoughts via voice or type them out
- 🧠 **Intelligent Analysis** - Automatically categorizes thoughts into tasks, ideas, reflections, and more
- ✅ **Task Management** - Break down complex tasks into manageable micro-steps
- 💬 **AI Chat** - Ask questions about your thoughts and get personalized insights
- 📊 **Focus Dashboard** - See what matters most with priority-based task sorting
- 📱 **SMS Integration** - Text your thoughts to Orin anytime
- 🔍 **Semantic Search** - Find related thoughts using natural language

## Tech Stack

### Frontend
- React Native 0.81.4 with Expo 54
- TypeScript for type safety
- Custom UI components with React Native styling

### Backend
- Supabase (PostgreSQL + Real-time + Edge Functions)
- Vector embeddings for semantic search (pgvector)
- Row-level security for data protection

### AI & ML
- OpenAI GPT-4o-mini for thought analysis and chat
- OpenAI Whisper for audio transcription
- Vector embeddings for intelligent search

### Services
- Twilio for SMS messaging
- Expo Application Services (EAS) for builds

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI
- Supabase account
- OpenAI API key
- Twilio account (optional, for SMS)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nutrifyu/orin-app.git
cd orin-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

4. Set up the Supabase database:
```bash
# Run migrations in supabase/migrations/
```

5. Deploy Edge Functions:
```bash
# Deploy the orin-chat and send-sms functions
supabase functions deploy orin-chat
supabase functions deploy send-sms
```

6. Start the development server:
```bash
npx expo start
```

### Running on Device

- Scan the QR code with Expo Go (iOS) or the Expo app (Android)
- Or press `i` for iOS simulator, `a` for Android emulator

## Building for Production

### iOS (via EAS)

```bash
eas build --platform ios --profile preview
```

### Android

```bash
eas build --platform android --profile preview
```

## Project Structure

```
orin-app/
├── assets/              # Images, icons, and static files
├── components/          # React Native components
│   ├── HomeScreen.tsx   # Main dashboard
│   ├── OrinAIChat.tsx   # Chat interface
│   ├── BrainDashboard.tsx # Focus & analytics
│   └── ...
├── contexts/            # React Context providers
│   └── AuthContext.tsx  # Authentication state
├── hooks/               # Custom React hooks
│   └── useRecording.ts  # Audio recording logic
├── lib/                 # Third-party integrations
│   └── supabase.ts      # Supabase client
├── supabase/            # Backend code
│   ├── functions/       # Edge functions
│   └── migrations/      # Database migrations
├── utils/               # Utility functions
│   ├── analyzer.ts      # Thought analysis logic
│   ├── embeddings.ts    # Vector embeddings
│   └── transcription.ts # Audio transcription
├── App.tsx              # Root component
└── app.json             # Expo configuration
```

## Key Features Explained

### Thought Analysis Pipeline

1. User records voice note or types text
2. Audio is transcribed using OpenAI Whisper
3. Text is analyzed by GPT-4o-mini to extract:
   - Type (task, idea, reflection, reminder, question, event)
   - Importance level (high, medium, low)
   - Deadline (if mentioned)
   - Time needed
   - Category
   - Next action
   - Sentiment
4. Thoughts are stored with vector embeddings for semantic search
5. Complex tasks are automatically broken into micro-steps

### Executive Dysfunction Support

For users who struggle with task initiation:
- Large tasks are automatically split into 5-7 micro-steps
- The first step is always extremely small (e.g., "Find 3 boxes")
- Visual progress tracking with checkboxes
- Step-by-step guidance to build momentum

### AI Chat (Orin)

- Conversational interface to explore your thoughts
- Searches through all your captured thoughts
- Provides insights and recommendations
- Natural, friendly responses (not robotic)
- Markdown formatting for better readability

## Database Schema

### Main Tables

- **profiles** - User accounts and preferences
- **thoughts** - Core data model for all captured thoughts
- **mind_dumps** - Raw voice/text before processing
- **thought_vectors** - Vector embeddings for search
- **thought_relations** - Connections between thoughts
- **sms_messages** - SMS conversation history

## Environment Variables

### Required
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_OPENAI_API_KEY` - OpenAI API key

### Optional (for Edge Functions)
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `OPENAI_API_KEY` - OpenAI key (for edge functions)

## Contributing

This is a personal project, but suggestions and bug reports are welcome via GitHub Issues.

## License

MIT License - See LICENSE file for details

## Acknowledgments

Built with:
- [Expo](https://expo.dev)
- [Supabase](https://supabase.com)
- [OpenAI](https://openai.com)
- [React Native](https://reactnative.dev)
- [Twilio](https://twilio.com)