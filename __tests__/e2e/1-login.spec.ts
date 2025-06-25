import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('Login page should have all the required elements', async ({
  page,
  isMobile,
}) => {
  await page.goto('http://localhost:3000/sign-in');
  if (!isMobile) {
    await expect(page.getByRole('img', { name: 'Image' })).toBeVisible();
  }
  await expect(
    page.getByRole('heading', { name: 'Welcome back' })
  ).toBeVisible();
  await expect(page.getByText('Login to your Arunya account.')).toBeVisible();
  await expect(page.getByText('Username')).toBeVisible();
  await expect(page.getByPlaceholder('admin')).toBeVisible();
  await expect(page.getByText('Password')).toBeVisible();
  await expect(page.getByPlaceholder('********')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('Should fail to login with invalid credentials', async ({ page }) => {
  await page.goto('http://localhost:3000/sign-in');
  await page.getByPlaceholder('admin').click();
  await page.getByPlaceholder('admin').fill('admin');
  await page.getByPlaceholder('********').click();
  await page.getByPlaceholder('********').fill('arunyaadmin');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Error While Logging In')).toBeVisible();
});

test('Should login with valid credentials', async ({ page }) => {
  await page.goto('http://localhost:3000/sign-in');
  await page.getByPlaceholder('admin').click();
  await page.getByPlaceholder('admin').fill('admin');
  await page.getByPlaceholder('********').click();
  await page.getByPlaceholder('********').fill('arunyaadmin@6969');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('http://localhost:3000/dashboard/websites');
  const storagePath = path.join(
    process.cwd(),
    '__tests__',
    'e2e',
    'storage-state.json'
  );
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  await page.context().storageState({ path: storagePath });
});
