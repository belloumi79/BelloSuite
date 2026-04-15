
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 })

    const projects = await prisma.project.findMany({
      where: { tenantId },
      include: {
        columns: { orderBy: { position: 'asc' } },
        members: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(projects)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, name, description, color, endDate } = body
    if (!tenantId || !name) return NextResponse.json({ error: "tenantId and name required" }, { status: 400 })

    const project = await prisma.project.create({
      data: { tenantId, name, description, color: color || "#6366f1", endDate: endDate ? new Date(endDate) : null },
    })

    // Create default Kanban columns
    const defaultColumns = ["À faire", "En cours", "Terminé"]
    for (let i = 0; i < defaultColumns.length; i++) {
      await prisma.projectColumn.create({ data: { projectId: project.id, name: defaultColumns[i], position: i, color: "#6366f1" } })
    }

    return NextResponse.json(project)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
