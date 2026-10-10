import { NextResponse } from 'next/server'

export class BusinessError extends Error {
  /** `details` : champs ajoutés à la réponse JSON (ex. { code, products }) pour une traduction côté client. */
  constructor(message: string, public statusCode: number = 400, public details?: Record<string, unknown>) {
    super(message)
    this.name = 'BusinessError'
  }
}

export function handleApiError(error: unknown, operation: string): NextResponse {
  console.error(`${operation} error:`, error)

  if (error instanceof BusinessError) {
    return NextResponse.json({ ...(error.details ?? {}), error: error.message }, { status: error.statusCode })
  }

  // For unknown errors, return generic message
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
}