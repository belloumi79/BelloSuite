'use server'

import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'

export async function loginUser(email: string, password: string) {
  console.log('Login attempt for:', email)
  try {
    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
    })

    if (!user) {
      console.log('User not found or inactive:', email)
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    console.log('User found:', user.email, 'Role:', user.role)
    
    // Explicitly check password match
    const isMatch = bcrypt.compareSync(password, user.password)
    console.log('Password match result:', isMatch)
    
    if (!isMatch) {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    // Return user metadata for session (excluding password)
    const { password: _, ...userWithoutPassword } = user
    console.log('Login successful for:', email)
    return { success: true, user: userWithoutPassword }
  } catch (error) {
    console.error('CRITICAL Login error:', error)
    return { success: false, error: 'Une erreur est survenue lors de la connexion' }
  }
}
