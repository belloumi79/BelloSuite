/**
 * Onboarding self-service : un utilisateur connecté SANS entreprise crée la sienne.
 *
 *  GET  /api/tenant/onboard → liste des modules activables (pour le formulaire)
 *  POST /api/tenant/onboard → crée Tenant + TenantModule(s) + rattache l'utilisateur comme ADMIN
 *                             (transaction Prisma), puis ré-émet le cookie de session avec le tenantId.
 *
 * SÉCURITÉ : l'utilisateur est identifié par la session signée (jamais par un email du body).
 * Refusé si l'utilisateur a déjà un tenant (vérifié en base, pas seulement dans le jeton) ou s'il est SUPER_ADMIN.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/api-auth'
import { createSessionCookie } from '@/lib/session'
import { parseBody, handleApiError } from '@/lib/api'
import { slugifySubdomain } from '@/lib/onboarding'
import { enforceRateLimits } from '@/lib/rate-limit-persistent'

export const runtime = 'nodejs'

const DEFAULT_MODULES = ['Stock', 'Commercial', 'Accounting']

const onboardSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  subdomain: z.string().trim().max(40).optional().nullable(),
  matriculeFiscal: z.string().trim().max(40).optional().nullable(),
  vatNumber: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  zipCode: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional().nullable(),
  modules: z.array(z.string().min(1).max(60)).max(30).optional(),
})

class OnboardConflict extends Error {}

export async function GET(req: Request) {
  const session = await requireSession(req)
  if (session instanceof NextResponse) return session
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    select: { name: true, displayName: true, description: true },
    orderBy: { displayName: 'asc' },
  })
  return NextResponse.json({ modules, defaults: DEFAULT_MODULES })
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(req)
    if (session instanceof NextResponse) return session

    if (session.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Le Super Admin ne crée pas d’entreprise par l’onboarding' }, { status: 403 })
    }

    const limited = await enforceRateLimits([{ key: `onboard:user:${session.id}`, max: 10, windowSeconds: 60 * 60 }])
    if (limited) return limited

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
    }
    const data = parseBody(onboardSchema, body)
    if (data instanceof NextResponse) return data

    const dbUser = await prisma.user.findUnique({ where: { email: session.email } })
    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'Compte introuvable ou désactivé' }, { status: 403 })
    }
    if (dbUser.tenantId) {
      return NextResponse.json({ error: 'Ce compte est déjà rattaché à une entreprise' }, { status: 409 })
    }

    const subdomain = slugifySubdomain(data.subdomain || data.companyName)
    if (!subdomain) {
      return NextResponse.json({ error: 'Sous-domaine invalide' }, { status: 400 })
    }
    if (await prisma.tenant.findUnique({ where: { subdomain } })) {
      return NextResponse.json({ error: 'Ce sous-domaine est déjà utilisé' }, { status: 409 })
    }

    const wanted = data.modules && data.modules.length > 0 ? data.modules : DEFAULT_MODULES

    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name: data.companyName,
          subdomain,
          matriculeFiscal: data.matriculeFiscal || null,
          vatNumber: data.vatNumber || null,
          address: data.address || null,
          city: data.city || null,
          zipCode: data.zipCode || null,
          phone: data.phone || null,
          email: data.email || null,
          isActive: true,
        },
      })

      const modules = await tx.module.findMany({ where: { name: { in: wanted }, isActive: true } })
      if (modules.length > 0) {
        await tx.tenantModule.createMany({
          data: modules.map((m) => ({ tenantId: created.id, moduleId: m.id, isEnabled: true })),
        })
      }

      // Garde anti-course : ne rattache que si l'utilisateur n'a toujours pas de tenant.
      const linked = await tx.user.updateMany({
        where: { id: dbUser.id, tenantId: null },
        data: { tenantId: created.id, role: 'ADMIN' },
      })
      if (linked.count !== 1) throw new OnboardConflict()

      return created
    })

    await createSessionCookie({
      id: session.id,
      email: session.email,
      role: 'ADMIN',
      tenantId: tenant.id,
      firstName: session.firstName,
    })

    return NextResponse.json({ tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain } }, { status: 201 })
  } catch (err) {
    if (err instanceof OnboardConflict) {
      return NextResponse.json({ error: 'Ce compte est déjà rattaché à une entreprise' }, { status: 409 })
    }
    if (typeof err === 'object' && err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ce sous-domaine est déjà utilisé' }, { status: 409 })
    }
    return handleApiError(err, 'POST tenant/onboard')
  }
}
