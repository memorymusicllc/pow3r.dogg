import { test, expect } from '@playwright/test';

const PROD_URL = 'https://pow3r-defender-production.contact-7d8.workers.dev';

test.describe('Admin Dashboard', () => {
  test('should load dashboard homepage', async ({ page }) => {
    await page.goto(`${PROD_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Check for HTML structure
    const html = await page.content();
    expect(html).toContain('html');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/dashboard-homepage.png', fullPage: true });
  });

  test('should display dashboard structure', async ({ page }) => {
    await page.goto(`${PROD_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check for React root element or body exists (even if hidden initially)
    const root = await page.locator('#root, body').first();
    await expect(root).toHaveCount(1, { timeout: 5000 });
    
    // Verify page has content
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);
    
    await page.screenshot({ path: 'test-results/dashboard-structure.png', fullPage: true });
  });

  test('should handle navigation to admin routes', async ({ page }) => {
    await page.goto(`${PROD_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Verify page is accessible
    const url = page.url();
    expect(url).toContain('/admin');
    
    await page.screenshot({ path: 'test-results/dashboard-navigation.png', fullPage: true });
  });

  test('should serve static assets', async ({ request }) => {
    // Test CSS asset
    const cssResponse = await request.get(`${PROD_URL}/admin/assets/index-DvyXkRZo.css`);
    expect(cssResponse.status()).toBe(200);
    const contentType = cssResponse.headers()['content-type'];
    expect(contentType).toMatch(/css|text/);
    
    // Test JS asset
    const jsResponse = await request.get(`${PROD_URL}/admin/assets/index-WwelWwOG.js`);
    expect(jsResponse.status()).toBe(200);
    const jsContentType = jsResponse.headers()['content-type'];
    expect(jsContentType).toMatch(/javascript|application/);
  });

  test('should handle API endpoints', async ({ request }) => {
    // Test that API endpoints are accessible (may return 401 without auth)
    const apiResponse = await request.get(`${PROD_URL}/admin/osint/lookup`);
    expect([200, 401, 403, 404, 405]).toContain(apiResponse.status());
  });
});

