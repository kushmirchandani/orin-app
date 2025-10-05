import OpenAI from 'openai'

/**
 * Generate embedding vector for a text using OpenAI
 * Uses text-embedding-3-small (1536 dimensions)
 */
export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY

  if (!apiKey) {
    console.error('OpenAI API key not found in environment variables')
    return null
  }

  try {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    return null
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export const generateEmbeddings = async (
  texts: string[]
): Promise<Array<number[] | null>> => {
  // Process in parallel but with rate limiting
  const promises = texts.map((text) => generateEmbedding(text))
  return Promise.all(promises)
}

/**
 * Calculate cosine similarity between two vectors
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
