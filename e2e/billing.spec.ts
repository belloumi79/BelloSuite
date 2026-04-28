import { test, expect } from '@playwright/test'

test.describe('Billing Flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authentication
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill('admin@demo.tn')
    await page.getByPlaceholder(/mot de passe/i).fill('demo123')
    await page.getByRole('button', { name: /se connecter/i }).click()
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/)
    await expect(page.locator('aside')).toBeVisible()
  })

  test('should create a new client', async ({ page }) => {
    // 2. Navigate to Clients
    await page.goto('/fr/commercial/clients')
    // Wait for the localized title
    await expect(page.locator('h1')).toBeVisible()

    // 3. Open Modal
    await page.getByRole('button', { name: /nouveau/i }).click()
    
    const clientName = `Test Client ${Date.now()}`
    // Using placeholders as seen in ClientModal.tsx
    await page.getByPlaceholder(/nom de l'entreprise/i).fill(clientName)
    // Code is auto-generated, but let's override if needed or just fill other fields
    await page.getByPlaceholder(/matricule fiscal/i).fill('1234567/A/M/000')
    await page.getByPlaceholder(/email/i).fill(`test-${Date.now()}@example.com`)
    
    // 4. Save
    await page.getByRole('button', { name: /enregistrer/i }).click()
    
    // 5. Verify in list
    await expect(page.getByText(clientName)).toBeVisible()
  })

  test('should create a new invoice', async ({ page }) => {
    // 2. Navigate to New Invoice
    await page.goto('/fr/commercial/documents/new')
    await expect(page.locator('h1')).toContainText(/nouveau document/i)

    // 3. Select Client
    // Wait for clients to load in select
    const clientSelect = page.locator('select').first()
    await clientSelect.selectOption({ index: 1 })
    
    // 4. Add Item (already one line exists by default)
    // Filling the first line
    await page.locator('input[placeholder*="désignation" i]').first().fill('Service de Refactorisation E2E')
    await page.locator('input[type="number"]').nth(0).fill('5') // Qty
    await page.locator('input[type="number"]').nth(1).fill('150') // Price
    
    // 5. Save
    await page.getByRole('button', { name: /enregistrer/i }).click()
    
    // 6. Verify redirect to list
    await page.waitForURL(/\/commercial\/documents/)
    await expect(page.locator('table')).toContainText('Service de Refactorisation E2E')
  })
})
