interface OnboardingAnswers {
  whatBringsYou?: string
  areasToOrganize?: string[]
  capturePreference?: string
  overwhelmedTime?: string
  mainGoal?: string
  additionalInfo?: string
}

export const generateUserMemory = (answers: OnboardingAnswers): string => {
  const parts: string[] = []

  // Add what brings them to Orin
  if (answers.whatBringsYou) {
    parts.push(answers.whatBringsYou.trim())
  }

  // Add areas they want to organize
  if (answers.areasToOrganize && answers.areasToOrganize.length > 0) {
    const areas = answers.areasToOrganize.join(', ')
    parts.push(`They want to organize their ${areas.toLowerCase()}.`)
  }

  // Add capture preference
  if (answers.capturePreference) {
    parts.push(`Prefers ${answers.capturePreference.toLowerCase()}.`)
  }

  // Add overwhelmed time
  if (answers.overwhelmedTime) {
    parts.push(`Feels most overwhelmed in the ${answers.overwhelmedTime.toLowerCase()}.`)
  }

  // Add main goal
  if (answers.mainGoal) {
    parts.push(`Main goal: ${answers.mainGoal.trim().toLowerCase()}.`)
  }

  // Add additional info if provided
  if (answers.additionalInfo) {
    parts.push(answers.additionalInfo.trim())
  }

  // Combine into 2-3 sentences
  let memory = parts.join(' ')

  // Ensure proper sentence structure
  memory = memory.replace(/\.\s+\./g, '.')
  memory = memory.replace(/\s+/g, ' ')
  memory = memory.trim()

  // If no memory generated, provide default
  if (!memory) {
    memory = 'User is exploring Orin to better organize their thoughts and reduce mental clutter.'
  }

  return memory
}
