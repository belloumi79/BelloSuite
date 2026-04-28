import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getProjects, createProject, createProjectSchema } from '@/services/projects'

// GET /api/projects?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const projects = await getProjects(ctx.tenantId)
    return NextResponse.json(projects)
  } catch (err) {
    return handleApiError(err, 'GET projects')
  }
}

// POST /api/projects
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createProjectSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const project = await createProject(data)
    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST project')
  }
}
