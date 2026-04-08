import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    const employee = await prisma.employee.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: {
        qualification: true,
        absences: { orderBy: { dateDebut: 'desc' }, take: 5 },
        delays: { orderBy: { date: 'desc' }, take: 5 },
        mutations: { orderBy: { dateEffet: 'desc' }, take: 3 },
        paySlips: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tenantId, ...data } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const employee = await prisma.employee.updateMany({
      where: { id, tenantId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
        salary: data.salary !== undefined ? Number(data.salary) : undefined,
        enfantsCharge: data.enfantsCharge !== undefined ? Number(data.enfantsCharge) : undefined,
      },
    })

    if (employee.count === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const updated = await prisma.employee.findFirst({ where: { id, tenantId } })
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const employee = await prisma.employee.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    })

    if (employee.count === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Employee deactivated' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
