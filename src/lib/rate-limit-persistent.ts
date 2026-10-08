/**
 * Rate limit persistant sans service payant : compteur à fenêtre fixe dans Postgres (table "RateLimit"),
 * partagé entre toutes les instances serverless. Si la base est indisponible ou si la table n'existe
 * pas encore (migration non appliquée), repli automatique sur le limiteur en mémoire.
 *
 * Usage (routes Node.js uniquement — pas dans le proxy) :
 *   const rl = await rateLimitPersistent(`login:ip:${ip}`, 10, 60)
 *   if (!rl.success) return tooManyRequests(rl)
 */
import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, type RateLimitResult } from '@/lib/rate-limit'

let warnedFallback = false

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function rateLimitPersistent(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult & { store: 'db' | 'memory' }> {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; windowStart: Date }>>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${hashKey(key)}, 1, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" <= NOW() - make_interval(secs => ${windowSeconds}) THEN 1
          ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" <= NOW() - make_interval(secs => ${windowSeconds}) THEN NOW()
          ELSE "RateLimit"."windowStart" END
      RETURNING "count", "windowStart"`
    const row = rows[0]
    const count = Number(row.count)
    const reset = new Date(row.windowStart).getTime() + windowSeconds * 1000

    // Ménage occasionnel (~1 % des appels) des fenêtres expirées depuis plus d'un jour
    if (Math.random() < 0.01) {
      prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "windowStart" < NOW() - INTERVAL '1 day'`.catch(() => {})
    }

    return {
      success: count <= maxRequests,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - count),
      reset,
      store: 'db',
    }
  } catch (err) {
    if (!warnedFallback) {
      warnedFallback = true
      console.warn('[rate-limit] table RateLimit indisponible, repli en mémoire :', (err as Error)?.message)
    }
    return { ...rateLimit(key, maxRequests, windowSeconds), store: 'memory' }
  }
}

/** IP cliente (Vercel renseigne x-forwarded-for / x-real-ip). */
export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function tooManyRequests(rl: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}

/** Applique plusieurs limites (ex. par IP ET par email) ; renvoie la réponse 429 ou null. */
export async function enforceRateLimits(
  limits: Array<{ key: string; max: number; windowSeconds: number }>
): Promise<NextResponse | null> {
  for (const l of limits) {
    const rl = await rateLimitPersistent(l.key, l.max, l.windowSeconds)
    if (!rl.success) return tooManyRequests(rl)
  }
  return null
}
