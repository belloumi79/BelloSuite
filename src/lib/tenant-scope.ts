/**
 * Vérifications d'appartenance au tenant pour les tables « enfants » sans colonne tenantId
 * (ProjectColumn, ProjectTask, ProjectComment…). À appeler avant toute lecture/écriture par id.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const notFound = () => NextResponse.json({ error: 'Introuvable' }, { status: 404 })

export async function projectInTenant(projectId: string | null | undefined, tenantId: string): Promise<boolean> {
  if (!projectId) return false
  return (await prisma.project.count({ where: { id: projectId, tenantId } })) > 0
}

export async function columnInTenant(columnId: string | null | undefined, tenantId: string): Promise<boolean> {
  if (!columnId) return false
  return (await prisma.projectColumn.count({ where: { id: columnId, project: { tenantId } } })) > 0
}

export async function taskInTenant(taskId: string | null | undefined, tenantId: string): Promise<boolean> {
  if (!taskId) return false
  return (await prisma.projectTask.count({ where: { id: taskId, column: { project: { tenantId } } } })) > 0
}
