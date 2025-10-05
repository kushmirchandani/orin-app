import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'

interface User {
  name: string
  email: string
  userMemory?: string
  onboardingComplete?: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signUp: (name: string, email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  reloadUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        // Clear invalid session
        supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setIsLoading(false)
        return
      }

      setSession(session)
      if (session?.user) {
        loadUserProfile(session.user)
      } else {
        setIsLoading(false)
      }
    }).catch((error) => {
      console.error('Session error:', error)
      setSession(null)
      setUser(null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadUserProfile(session.user)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // Get user profile from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, user_memory, onboarding_complete')
        .eq('id', supabaseUser.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet, use email from auth
        setUser({
          name: '',
          email: supabaseUser.email || '',
          userMemory: undefined,
          onboardingComplete: false,
        })
      } else if (data) {
        setUser({
          name: data.name || '',
          email: data.email || supabaseUser.email || '',
          userMemory: data.user_memory || undefined,
          onboardingComplete: data.onboarding_complete || false,
        })
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (name: string, email: string, password: string) => {
    try {
      console.log('Starting signup for:', email)

      // Sign up with Supabase Auth with metadata and disable email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: undefined,
        }
      })

      console.log('Signup response:', { data, error })

      if (error) {
        console.error('Signup error:', error)
        throw error
      }

      if (!data.user) {
        console.error('No user returned from signup')
        throw new Error('Signup failed - no user created')
      }

      console.log('User created successfully:', data.user.id)

      // If there's a session, the user is automatically confirmed
      if (data.session) {
        console.log('User has active session, loading profile...')
        await loadUserProfile(data.user)
      }

      // Profile will be created automatically by the database trigger
      // No need to manually create it here
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    }
  }

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Silently fail - error is shown in UI
        return false
      }

      if (data.user) {
        await loadUserProfile(data.user)
        return true
      }

      return false
    } catch (error) {
      // Silently fail - error is shown in UI
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const reloadUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await loadUserProfile(currentUser)
      }
    } catch (error) {
      console.error('Error reloading user:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!session,
        isLoading,
        signUp,
        signIn,
        signOut,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
