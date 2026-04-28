import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getAllUsers } from '@/services/super-admin'
import { UserRole } from '@prisma/client'

// GET /api/super-admin/users
export async function GET(req: NextRequest) {
  try {
    const ctx = getSuperAdminContext(req)
    if (ctx instanceof NextResponse) return ctx

    const users = await getAllUsers(ctx.userRole as UserRole)
    return NextResponse.json(users)
  } catch (err) {
    return handleApiError(err, 'GET super-admin users')
  }
}
