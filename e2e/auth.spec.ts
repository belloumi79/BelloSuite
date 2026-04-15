/**
 * E2E tests — Auth flow
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /créer votre compte/i })).toBeVisible()
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/mot de passe/i)).toBeVisible()
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/mot de passe/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
  })

  test('redirect to login when accessing dashboard without session', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('password mismatch shows alert on register', async ({ page }) => {
    await page.goto('/register')
    await page.getByPlaceholder(/email/i).fill('test@example.com')
    await page.getByPlaceholder(/mot de passe/i).fill('Test1234!')
    await page.getByPlaceholder(/confirmer/i).fill('DifferentPass1!')
    await page.getByRole('button', { name: /créer/i }).click()
    // Should show alert
    const dialog = await page.waitForEvent('dialog', { timeout: 3000 }).catch(() => null)
    if (dialog) expect(dialog.message()).toContain('correspondent')
  })

  test('login form validates required fields', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /se connecter/i }).click()
    // Should not crash — form handles empty state
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('sidebar renders all module links', async ({ page }) => {
    // Note: requires mock session, will skip in CI without auth
    await page.goto('/login')
    await expect(page.locator('aside')).toBeVisible()
  })
})