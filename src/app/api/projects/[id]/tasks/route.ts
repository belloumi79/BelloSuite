import { projectInTenant, columnInTenant, taskInTenant, notFound } from '@/lib/tenant-scope'
import { requireTenant } from '@/lib/api-auth'

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params
  const tasks = await prisma.projectTask.findMany({ where: { column: { projectId: id, project: { tenantId: ctx.tenantId } } }, include: { comments: true, tags: true, checklists: true } })
  return NextResponse.json(tasks)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const { id } = await params
    const body = await request.json()
    const { columnId, title, description, priority, assigneeId, dueDate, checklistItem } = body
    if (!columnId || !title) return NextResponse.json({ error: "columnId and title required" }, { status: 400 })
    if (!(await columnInTenant(columnId, ctx.tenantId))) return notFound()

    const maxPos = await prisma.projectTask.aggregate({ where: { columnId }, _max: { position: true } })
    const task = await prisma.projectTask.create({
      data: { columnId, title, description, priority: priority || "medium", assigneeId, dueDate: dueDate ? new Date(dueDate) : null, position: (maxPos._max.position ?? -1) + 1,
        ...(checklistItem ? { isChecklistItem: true, checked: false } : {}) }
    })
    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const { id } = await params
    const body = await request.json()
    const { taskId, columnId, title, description, priority, assigneeId, dueDate } = body
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 })
    if (!(await taskInTenant(taskId, ctx.tenantId))) return notFound()
    if (columnId && !(await columnInTenant(columnId, ctx.tenantId))) return notFound()
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: { columnId, title, description, priority, assigneeId, dueDate: dueDate ? new Date(dueDate) : null }
    })
    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
