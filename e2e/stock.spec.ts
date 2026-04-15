/**
 * E2E tests — Stock module
 */

import { test, expect } from '@playwright/test'

test.describe('Stock Module', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock session to bypass auth redirect
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

  test('products page loads', async ({ page }) => {
    await page.goto('/stock/products')
    await page.waitForLoadState('networkidle')
    // Page should render (may show empty state or products)
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })

  test('import page renders dropzone', async ({ page }) => {
    await page.goto('/stock/products/import')
    await expect(page.getByText(/glissez.*csv.*excel/i)).toBeVisible()
    await expect(page.getByText(/template/i)).toBeVisible()
  })

  test('warehouse page renders', async ({ page }) => {
    await page.goto('/stock/warehouses')
    await expect(page.locator('h1')).toBeVisible()
  })
})