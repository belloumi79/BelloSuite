import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/projects/[id]/columns — add column
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, name, color, isDone } = body
    if (!projectId || !name) return NextResponse.json({ error: 'projectId and name required' }, { status: 400 })
    const maxPos = await prisma.projectColumn.aggregate({ where: { projectId }, _max: { position: true } })
    const col = await prisma.projectColumn.create({
      data: { projectId, name, color: color || '#6366f1', isDone: isDone || false, position: (maxPos._max.position ?? -1) + 1 },
    })
    return NextResponse.json(col)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/projects/[id]/columns?id=xxx — update column
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const columnId = searchParams.get('id')
    if (!columnId) return NextResponse.json({ error: 'columnId required' }, { status: 400 })
    const body = await req.json()
    const updated = await prisma.projectColumn.update({
      where: { id: columnId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.isDone !== undefined && { isDone: body.isDone }),
      },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/columns?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const columnId = searchParams.get('id')
    if (!columnId) return NextResponse.json({ error: 'columnId required' }, { status: 400 })
    await prisma.projectColumn.delete({ where: { id: columnId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
