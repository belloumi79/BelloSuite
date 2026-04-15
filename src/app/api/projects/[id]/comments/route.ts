import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/projects/[id]/comments?taskId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    const comments = await prisma.projectComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(comments)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/projects/[id]/comments — add comment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { taskId, authorId, authorName, content } = body
    if (!taskId || !authorId || !authorName || !content) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }
    const comment = await prisma.projectComment.create({
      data: { taskId, authorId, authorName, content },
    })
    return NextResponse.json(comment)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
