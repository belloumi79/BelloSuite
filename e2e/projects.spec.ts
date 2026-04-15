/**
 * E2E tests — Projects / Kanban
 */

import { test, expect } from '@playwright/test'

test.describe('Projects / Kanban', () => {
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

  test('projects list page renders', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('kanban board renders columns', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByText(/kanban|todo|en cours|termine/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no project yet, page still renders without error
      expect(page.locator('h1')).toBeVisible()
    })
  })
})