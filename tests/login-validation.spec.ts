import { test, type Page } from '@playwright/test'
import fs from 'fs'

const DIR = 'test-screenshots'

async function shot(page: Page, name: string) {
  fs.mkdirSync(DIR, { recursive: true })
  await page.screenshot({ path: `${DIR}/${name}.png` })
}

async function switchToSignup(page: Page) {
  await page.getByRole('tab', { name: 'Criar Conta' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
})

// ─── Login ───────────────────────────────────────────────

test('login: 01 initial state', async ({ page }) => {
  await shot(page, '01-login-initial')
})

test('login: 02 submit empty form — both errors appear', async ({ page }) => {
  await page.click('button[type="submit"]')
  await shot(page, '02-login-empty-submit')
})

test('login: 03 invalid email on blur', async ({ page }) => {
  await page.fill('#login-email', 'notanemail')
  await page.locator('#login-email').blur()
  await shot(page, '03-login-invalid-email')
})

test('login: 04 fix email — error clears', async ({ page }) => {
  await page.fill('#login-email', 'notanemail')
  await page.locator('#login-email').blur()
  await page.fill('#login-email', 'valid@example.com')
  await shot(page, '04-login-email-error-cleared')
})

test('login: 05 valid email + empty password on submit', async ({ page }) => {
  await page.fill('#login-email', 'valid@example.com')
  await page.click('button[type="submit"]')
  await shot(page, '05-login-missing-password')
})

// ─── Sign Up ─────────────────────────────────────────────

test('signup: 06 initial state', async ({ page }) => {
  await switchToSignup(page)
  await shot(page, '06-signup-initial')
})

test('signup: 07 submit empty form — all errors appear', async ({ page }) => {
  await switchToSignup(page)
  await page.click('button[type="submit"]')
  await shot(page, '07-signup-empty-submit')
})

test('signup: 08 invalid email on blur', async ({ page }) => {
  await switchToSignup(page)
  await page.fill('#signup-email', 'bademail')
  await page.locator('#signup-email').blur()
  await shot(page, '08-signup-invalid-email')
})

test('signup: 09 weak password (< 8 chars) — strength bar', async ({ page }) => {
  await switchToSignup(page)
  await page.fill('#signup-password', 'abc')
  await shot(page, '09-signup-weak-password')
})

test('signup: 10 medium password', async ({ page }) => {
  await switchToSignup(page)
  await page.fill('#signup-password', 'abcdefgh')
  await shot(page, '10-signup-medium-password')
})

test('signup: 11 strong password — strength bar full green', async ({ page }) => {
  await switchToSignup(page)
  await page.fill('#signup-password', 'Str0ng@Pass!')
  await shot(page, '11-signup-strong-password')
})

test('signup: 12 password too short error on blur', async ({ page }) => {
  await switchToSignup(page)
  await page.fill('#signup-password', 'short')
  await page.locator('#signup-password').blur()
  await shot(page, '12-signup-password-too-short-error')
})

test('signup: 13 confirm password mismatch — red XCircle', async ({ page }) => {
  await switchToSignup(page)
  await page.fill('#signup-password', 'Str0ng@Pass!')
  await page.fill('#confirmPassword', 'wrongpass')
  await shot(page, '13-signup-password-mismatch')
})

test('signup: 14 confirm password matches — green CheckCircle', async ({ page }) => {
  await switchToSignup(page)
  await page.fill('#signup-password', 'Str0ng@Pass!')
  await page.fill('#confirmPassword', 'Str0ng@Pass!')
  await shot(page, '14-signup-passwords-match')
})

test('signup: 15 all fields valid — ready to submit', async ({ page }) => {
  await switchToSignup(page)
  await page.fill('#signup-email', 'test@example.com')
  await page.fill('#signup-password', 'Str0ng@Pass!')
  await page.fill('#confirmPassword', 'Str0ng@Pass!')
  await shot(page, '15-signup-all-valid')
})
