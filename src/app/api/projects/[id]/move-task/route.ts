
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { taskId, targetColumnId } = body
    if (!taskId || !targetColumnId) return NextResponse.json({ error: "taskId and targetColumnId required" }, { status: 400 })

    const maxPos = await prisma.projectTask.aggregate({ where: { columnId: targetColumnId }, _max: { position: true } })
    await prisma.projectTask.update({ where: { id: taskId }, data: { columnId: targetColumnId, position: (maxPos._max.position ?? -1) + 1 } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
