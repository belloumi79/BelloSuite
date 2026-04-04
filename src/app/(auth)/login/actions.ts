'use server'

import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function loginUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
    })

    if (!user) {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    // Return user metadata for session (excluding password)
    const { password: _, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Une erreur est survenue lors de la connexion' }
  }
}
