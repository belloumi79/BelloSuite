import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const search = searchParams.get('search') || ''
    
    const users = await prisma.user.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(search ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: { tenant: { select: { id: true, name: true, subdomain: true } } },
      orderBy: { createdAt: 'desc' }
    })
    // Never return passwords
    return NextResponse.json(users.map(({ password, ...u }) => u))
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, email, password, firstName, lastName, role } = await req.json()

    if (!tenantId || !email || !password) {
      return NextResponse.json({ error: 'tenantId, email and password are required' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'USER',
        isActive: true
      }
    })
    const { password: _, ...safeUser } = user
    return NextResponse.json(safeUser, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
