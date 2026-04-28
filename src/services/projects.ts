import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { ProjectStatus, ProjectPriority } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const createProjectSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.string().default('#6366f1'),
  endDate: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.DRAFT),
  priority: z.nativeEnum(ProjectPriority).default(ProjectPriority.MEDIUM),
})

export type CreateProjectData = z.infer<typeof createProjectSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getProjects(tenantId: string) {
  return prisma.project.findMany({
    where: { tenantId },
    include: {
      columns: { orderBy: { position: 'asc' } },
      members: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createProject(data: CreateProjectData) {
  const { endDate, ...rest } = data

  return prisma.$transaction(async (tx) => {
    // 1. Create project
    const project = await tx.project.create({
      data: {
        ...rest,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    // 2. Create default columns
    const defaultColumns = [
      { name: 'À faire', position: 0, color: '#94a3b8' },
      { name: 'En cours', position: 1, color: '#6366f1' },
      { name: 'Terminé', position: 2, color: '#22c55e' },
    ]

    await tx.projectColumn.createMany({
      data: defaultColumns.map((col) => ({
        ...col,
        projectId: project.id,
      })),
    })

    return tx.project.findUnique({
      where: { id: project.id },
      include: { columns: true },
    })
  })
}

export async function moveTask(taskId: string, targetColumnId: string, newPosition: number, tenantId: string) {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    include: { column: { include: { project: true } } },
  })

  if (!task || task.column.project.tenantId !== tenantId) {
    throw new BusinessError('Tâche introuvable', 404)
  }

  return prisma.projectTask.update({
    where: { id: taskId },
    data: {
      columnId: targetColumnId,
      position: newPosition,
    },
  })
}
