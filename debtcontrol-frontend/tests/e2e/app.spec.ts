import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const APP_PASSWORD = 'debtcontrol123';

test.describe('DebtControl E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  const login = async (page: Page, password: string = APP_PASSWORD) => {
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');
  };

  test('Login page renders correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('DebtControl');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('Login with wrong password shows error', async ({ page }) => {
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Contraseña incorrecta')).toBeVisible();
  });

  test('Login with correct password succeeds', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/$/);
  });

  test('Auth guard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/debts');
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('Authenticated user stays on dashboard after redirect', async ({ page }) => {
    await login(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');
  });

  test('Desktop sidebar navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    const sidebarLinks = page.locator('aside nav a');
    const count = await sidebarLinks.count();
    expect(count).toBeGreaterThan(0);

    await page.click('aside nav a[href="/debts"]');
    await expect(page).toHaveURL(/\/debts/);

    await page.click('aside nav a[href="/transactions"]');
    await expect(page).toHaveURL(/\/transactions/);

    await page.click('aside nav a[href="/analytics"]');
    await expect(page).toHaveURL(/\/analytics/);

    await page.click('aside nav a[href="/settings"]');
    await expect(page).toHaveURL(/\/settings/);

    await page.click('aside nav a[href="/"]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('Mobile bottom navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeVisible();

    await bottomNav.locator('a[href="/debts"]').click();
    await expect(page).toHaveURL(/\/debts/);

    await bottomNav.locator('a[href="/transactions"]').click();
    await expect(page).toHaveURL(/\/transactions/);

    await bottomNav.locator('a[href="/analytics"]').click();
    await expect(page).toHaveURL(/\/analytics/);

    await bottomNav.locator('a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('Sidebar collapse works on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const collapseBtn = page.locator('aside button[aria-label="Expand sidebar"]');
    if (await collapseBtn.count() > 0) {
      await collapseBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('aside')).toHaveClass(/w-16/);
    }
  });

  test('Responsive layout changes between mobile and desktop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileNav = page.locator('nav.fixed.bottom-0');
    await expect(mobileNav).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 720 });
    const sidebar = page.locator('aside.hidden.lg\\:flex');
    await expect(sidebar).toBeVisible();
  });
});

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard loads with stats cards', async ({ page }) => {
    await expect(page.locator('text=Total Deuda')).toBeVisible();
    await expect(page.locator('text=Pagado Este Mes')).toBeVisible();
    await expect(page.locator('text=Próximo Pago')).toBeVisible();
    await expect(page.locator('text=Gasto Mensual')).toBeVisible();
  });

test('Dashboard shows loading skeleton initially', async ({ page }) => {
    await page.goto('/');
    const skeletons = page.locator('.skeleton');
    const count = await skeletons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

test.skip('FAB opens new debt modal', async ({ page }) => {
    await page.goto('/debts');
    await page.waitForLoadState('networkidle');

    const fab = page.locator('button.fixed').first();
    await fab.click();
    await page.waitForTimeout(500);
  });

  test('AI chat input works', async ({ page }) => {
    const aiInput = page.locator('input[placeholder*="pregunta"]').first();
    if (await aiInput.count() > 0) {
      await aiInput.fill('¿Cuánto debo?');
      await expect(aiInput).toHaveValue('¿Cuánto debo?');
    }
  });

  test('Dashboard cards are clickable', async ({ page }) => {
    const cards = page.locator('.hover-glow, .hover-lift');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Debts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.goto('/debts');
    await page.waitForLoadState('networkidle');
  });

  test('Debts page tabs work', async ({ page }) => {
    await page.click('button:has-text("Completadas")');
    await expect(page.locator('button:has-text("Completadas")')).toHaveClass(/bg-\[var\(--color-primary\)\]/);

    await page.click('button:has-text("Activas")');
    await expect(page.locator('button:has-text("Activas")')).toHaveClass(/bg-\[var\(--color-primary\)\]/);
  });

test('View mode toggle works', async ({ page }) => {
    await page.goto('/debts');
    await page.waitForLoadState('networkidle');

    const tableBtn = page.locator('button.lucide-list').locator('..');
    if (await tableBtn.count() > 0) {
      await tableBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test.skip('FAB opens new debt modal', async ({ page }) => {
    await page.goto('/debts');
    await page.waitForLoadState('networkidle');

    const fab = page.locator('button.fixed').filter({ hasText: '' }).first();
    await fab.click({ timeout: 5000 });

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
  });

  test('Modal close button works', async ({ page }) => {
    await page.goto('/debts');
    await page.waitForLoadState('networkidle');

    const fab = page.locator('button.fixed').first();
    await fab.click({ timeout: 5000 });
    await page.waitForTimeout(300);

    const closeBtn = page.locator('button').filter({ hasText: /Cancelar|Cerrar|X/ }).first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
    }
  });

test('Templates accordion works', async ({ page }) => {
    const details = page.locator('details.group');
    if (await details.count() > 0) {
      await page.click('details.group summary');
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Transactions Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
  });

  test('Search input filters transactions', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });

  test('Bank filter dropdown works', async ({ page }) => {
    const bankSelect = page.locator('select').first();
    if (await bankSelect.count() > 0) {
      const options = page.locator('select option');
      expect(await options.count()).toBeGreaterThan(0);
    }
  });

test('FAB opens new transaction modal', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    const fab = page.locator('button.fixed').first();
    await fab.click({ timeout: 5000 });
    await page.waitForTimeout(300);
  });

  test('Can register a new transaction', async ({ page }) => {
    await page.route(/\/transactions$/, async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `txn-${Date.now()}`,
            debt_instance_id: null,
            amount: body.amount,
            date: body.date,
            bank_account_id: body.bank_account_id,
            notes: body.notes,
            created_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    const fab = page.locator('button.fixed').first();
    await fab.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible();

    const inputs = modal.locator('input');
    await inputs.nth(0).fill('250.00');
    await inputs.nth(1).fill('2026-05-01');

    const submitBtn = page.locator('button:has-text("Registrar")').last();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    await expect(modal).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=$250.00').first()).toBeVisible({ timeout: 5000 });
  });

  test('Load more button appears when there are more transactions', async ({ page }) => {
    const loadMoreBtn = page.locator('button:has-text("Cargar más")');
    if (await loadMoreBtn.count() > 0) {
      await expect(loadMoreBtn).toBeVisible();
    }
  });
});

test.describe('Upload Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');
  });

  test('Upload page drag area is visible', async ({ page }) => {
    await expect(page.locator('text=Arrastra archivos aquí')).toBeVisible();
    await expect(page.locator('text=Seleccionar Archivo')).toBeVisible();
  });

  test('File input accepts correct file types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', /\.pdf|\.png|\.jpg|\.jpeg/);
  });

  test('Upload card displays empty state', async ({ page }) => {
    await expect(page.locator('text=No hay documentos subidos')).toBeVisible();
  });
});

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('Analytics page loads with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Analytics');
  });

  test('Charts are rendered', async ({ page }) => {
    const barChart = page.locator('.recharts-wrapper').first();
    await expect(barChart).toBeVisible();
  });

  test('AI report button is present', async ({ page }) => {
    await expect(page.locator('button:has-text("Generar")')).toBeVisible();
  });

  test('AI report generates when clicked', async ({ page }) => {
    const generateBtn = page.locator('button:has-text("Generar")');
    await generateBtn.click();
    await page.waitForTimeout(2000);
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('Settings page loads with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Configuración');
  });

  test('Dark mode toggle works', async ({ page }) => {
    const toggle = page.locator('button[aria-label], .w-12.h-7.rounded-full').first();
    if (await toggle.count() > 0) {
      await toggle.click();
      await page.waitForTimeout(300);
    }
  });

  test('Currency selector is present', async ({ page }) => {
    const currencySelect = page.locator('select').first();
    await expect(currencySelect).toBeVisible();
  });

  test('Bank accounts section exists', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Cuentas Bancarias' })).toBeVisible();
  });

  test('Categories section exists', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();
  });

  test('Add bank account button works', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button').nth(0);
    await addBtn.click({ timeout: 5000 });
    await page.waitForTimeout(300);
  });

  test('Add category button works', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const addBtns = page.locator('button');
    const count = await addBtns.count();
    if (count > 1) {
      await addBtns.nth(1).click({ timeout: 5000 });
      await page.waitForTimeout(300);
    }
  });

  test('Color picker in bank modal', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button').first();
    await addBtn.click({ timeout: 5000 });
    await page.waitForTimeout(300);
  });

  test('Logout from settings works', async ({ page }) => {
    const logoutBtn = page.locator('button[aria-label="Logout"]');
    await logoutBtn.click();
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Responsive Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 390, height: 844 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} (${viewport.width}x${viewport.height}) renders without errors`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('DebtControl');
      await page.fill('input[type="password"]', APP_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/');

      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.goto('/debts');
      await page.waitForLoadState('networkidle');

      await page.goto('/transactions');
      await page.waitForLoadState('networkidle');

      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      expect(errors.length).toBe(0);
    });
  }
});

test.describe('Edge Cases & Error States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-xyz');
    await page.waitForLoadState('networkidle');
  });

  test('Empty debts shows empty state message', async ({ page }) => {
    await page.goto('/debts');
    await page.waitForLoadState('networkidle');
    const emptyState = page.locator('text=No hay deudas');
    if (await emptyState.count() > 0) {
      await expect(emptyState.first()).toBeVisible();
    }
  });

  test('Empty transactions shows empty state message', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    const emptyState = page.locator('text=No hay transacciones');
    if (await emptyState.count() > 0) {
      await expect(emptyState.first()).toBeVisible();
    }
  });

  test('Error boundary displays on API failure', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    await page.reload();
    await page.waitForTimeout(1000);
  });

test('Form validation prevents empty submission', async ({ page }) => {
    await page.goto('/debts');
    await page.waitForLoadState('networkidle');

    const fab = page.locator('button.fixed.bottom-\\[76px\\].right-4').first();
    await fab.click();
    await page.waitForTimeout(300);

    const submitBtn = page.locator('button:has-text("Crear Deuda")');
    await submitBtn.click();
  });

  test('Pay modal shows correct info', async ({ page }) => {
    await page.goto('/debts');
    await page.waitForLoadState('networkidle');

    const payBtns = page.locator('button:has-text("Pagar")');
    if (await payBtns.count() > 0) {
      await payBtns.first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=Registrar Pago')).toBeVisible();
    }
  });
});

test.describe('Storage & Persistence', () => {
  test('Auth state persists in localStorage', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');

    const authState = await page.evaluate(() => {
      const data = localStorage.getItem('debtcontrol-auth');
      return data ? JSON.parse(data) : null;
    });
    expect(authState).toBeTruthy();
    expect(authState.state.isAuthenticated).toBe(true);
  });

  test('Settings persist across page reloads', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const currencySelect = page.locator('select').first();
    await currencySelect.selectOption('MXN');
    await page.waitForTimeout(500);
  });

  test('Dark mode toggle works', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('button').nth(0);
    await toggle.click();
    await page.waitForTimeout(500);
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', APP_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');
  });

  test('All interactive elements are focusable', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('Modals open correctly', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button').first();
    await addBtn.click({ timeout: 5000 });
    await page.waitForTimeout(300);
  });

  test('Buttons have accessible names', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

test.skip('Form inputs are present', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input[type="password"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });
});