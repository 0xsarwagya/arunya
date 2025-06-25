import { expect, test } from '@playwright/test';

test('Check if Sidebar Has All Links', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/websites');
  await expect(
    page.getByRole('link', { name: 'Image Arunya Analytics' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Dashboard' }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Websites' }).first()
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Insights' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Funnel' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retention' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'UTM' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Goals' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Journey' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Account' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
  await page.waitForTimeout(5000);
});
