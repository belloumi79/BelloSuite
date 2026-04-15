/**
 * E2E tests — Accounting module
 */

import { test, expect } from '@playwright/test'

test.describe('Accounting Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('bello_session', JSON.stringify({
        id: 'test-user-1',
        email: 'admin@test.tn',
        role: 'ADMIN',
        tenantId: 'test-tenant-1',
        firstName: 'Admin',
      }))
    })
  })

  test('chart of accounts page loads', async ({ page }) => {
    await page.goto('/accounting/chart')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('ledger page loads', async ({ page }) => {
    await page.goto('/accounting/ledger')
    await expect(page.getByText(/grand livre/i)).toBeVisible()
  })

  test('trial balance page loads', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    await expect(page.getByText(/balance/i)).toBeVisible()
  })

  test('import plan comptable page renders', async ({ page }) => {
    await page.goto('/accounting/chart/import')
    await expect(page.getByText(/import.*plan/i)).toBeVisible()
  })
})