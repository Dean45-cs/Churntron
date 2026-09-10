'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    })
    return {}
  } catch (error) {
    // signIn wirft bei Erfolg eine Redirect-Ausnahme – die muss durchlaufen.
    if (error instanceof AuthError) {
      return { error: 'E-Mail oder Passwort stimmt nicht.' }
    }
    throw error
  }
}
