import OpenAI from 'openai'

/**
 * Subtask for breaking down large tasks
 */
export interface Subtask {
  text: string
  order: number
}

/**
 * Single thought extracted from a mind dump
 */
export interface Thought {
  thought_text: string
  type: 'task' | 'idea' | 'reminder' | 'reflection' | 'question' | 'event'
  importance: 'high' | 'medium' | 'low'
  deadline: string | null // ISO 8601 or null
  time_needed_minutes: number | null
  category: string
  next_action: string | null
  related: string[] // Related thought indices
  resurface_timing: string // ISO 8601 or relative phrase
  sentiment: string
  subtasks: Subtask[] | null // For large tasks that need breaking down
}

/**
 * Full analysis result from AI
 */
export interface AnalyzedContent {
  summary: string
  priorities: string[]
  insights: string
  thoughts: Thought[]
}

export const analyzeWithOpenAI = async (
  transcript: string,
  userTimezone: string = 'America/New_York'
): Promise<AnalyzedContent | null> => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY

  if (!apiKey) {
    console.error('OpenAI API key not found in environment variables')
    return null
  }

  try {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

    const currentDate = new Date().toISOString()

    const systemPrompt = `You are a Thought Architect. Transform one raw mind dump into many structured thought objects.
Extract *every distinct thought*, classify it, add metadata for prioritization and resurfacing.
Always return strict JSON. Do not include commentary.`

    const userPrompt = `CURRENT DATE/TIME: ${currentDate}
USER TIMEZONE: ${userTimezone}

RAW_DUMP:
"${transcript}"

INSTRUCTIONS:
- Split into distinct items; do not merge unrelated thoughts.
- Identify type: one of ["task","idea","reminder","reflection","question","event"].

  TYPE CLASSIFICATION RULES:
  * "reminder" - Should be classified as "task" (reminders are actionable items to show in task list)
  * "reflection" - Thoughts about past experiences, memories, or introspection (show as notes)
  * "event" - For PAST events or experiences → classify as "reflection" (show as notes)
  * "event" - For FUTURE events or plans (e.g., "I need to go", "I'm going to") → classify as "task" (show in task list)
  * "task" - Actionable items, things to do, plans, or intentions
  * "idea" - Creative thoughts, suggestions, or concepts to explore later
  * "question" - Queries or things the user is wondering about

- Infer importance: "high"|"medium"|"low" from urgency/emotion/impact.
- Parse deadlines (understand relative dates like "Tuesday", "next week") and return ISO 8601 in ${userTimezone} if possible; else null.
- Estimate time_needed in minutes if hinted; else null.
- Assign a lightweight category (free text).
- Provide next_action if actionable; else null.
- Suggest resurface_timing as a *specific time expression* (e.g., "2025-10-06T09:00:00Z") or a relative phrase the server can normalize ("tomorrow morning", "2 days before deadline at 9am").
- Give sentiment (one word).
- List related thought indices (0-based) if thoughts connect.
- Also return global summary, top 3 priorities, and a one-line insight.

SUBTASK GENERATION (CRITICAL):
- For TASKS that are large, vague, or overwhelming (e.g., "plan wedding", "write research paper", "organize garage"), generate subtasks.
- Only generate subtasks for tasks that genuinely benefit from breaking down - NOT for simple, single-action items like "call mom" or "buy milk".
- The FIRST subtask should be extremely small and easy to complete (e.g., "Open Google Docs", "Create a folder", "Find notebook") to help overcome inertia.
- Each subtask should be a concrete, actionable micro-step.
- Order subtasks logically (first subtask is always the easiest starting point).
- Include 3-7 subtasks for large tasks.
- Set subtasks to null for simple tasks.

EXAMPLES OF WHEN TO GENERATE SUBTASKS:
✓ "Plan my sister's wedding" → Break down (large, multi-step project)
✓ "Write quarterly report" → Break down (complex, intimidating)
✓ "Organize home office" → Break down (vague, overwhelming)
✗ "Email John about meeting" → No subtasks (simple, single action)
✗ "Buy groceries" → No subtasks (straightforward task)
✗ "Call dentist to schedule appointment" → No subtasks (one clear action)

RETURN JSON (no extra keys):
{
  "summary": "",
  "priorities": ["", "", ""],
  "insights": "",
  "thoughts": [
    {
      "thought_text": "",
      "type": "",
      "importance": "",
      "deadline": "YYYY-MM-DDTHH:MM:SSZ" | null,
      "time_needed_minutes": 30 | null,
      "category": "",
      "next_action": "" | null,
      "related": [],
      "resurface_timing": "",
      "sentiment": "",
      "subtasks": [{"text": "Very small first step", "order": 1}, {"text": "Next step", "order": 2}] | null
    }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      console.error('No content in OpenAI response')
      return null
    }

    const parsed = JSON.parse(content) as AnalyzedContent

    // Validate structure
    if (!parsed.thoughts || !Array.isArray(parsed.thoughts)) {
      console.error('Invalid response structure from OpenAI')
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to analyze with OpenAI:', error)
    return null
  }
}

/**
 * Calculate confidence score for a thought based on completeness
 */
export const calculateConfidence = (thought: Thought): number => {
  let score = 0.5 // Base score

  // Has clear type
  if (thought.type) score += 0.1

  // Has importance
  if (thought.importance) score += 0.1

  // Has next action for tasks
  if (thought.type === 'task' && thought.next_action) score += 0.1

  // Has deadline for tasks
  if (thought.type === 'task' && thought.deadline) score += 0.1

  // Has category
  if (thought.category && thought.category.length > 0) score += 0.1

  return Math.min(score, 1.0)
}
