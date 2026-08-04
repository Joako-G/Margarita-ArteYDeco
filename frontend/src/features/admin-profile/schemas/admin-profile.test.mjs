import assert from 'node:assert/strict'
import test from 'node:test'

import {
  adminProfileEmailSchema,
  adminProfileNameSchema,
  adminProfilePasswordSchema,
} from './admin-profile.schema.ts'

test('valida el nombre completo administrativo', () => {
  assert.equal(adminProfileNameSchema.safeParse({ fullName: 'Margarita Admin' }).success, true)
  assert.equal(adminProfileNameSchema.safeParse({ fullName: 'A' }).success, false)
})

test('exige correo válido y contraseña actual', () => {
  assert.equal(adminProfileEmailSchema.safeParse({
    currentPassword: 'current-password',
    email: 'admin@example.com',
  }).success, true)
  assert.equal(adminProfileEmailSchema.safeParse({
    currentPassword: '',
    email: 'correo-invalido',
  }).success, false)
})

test('exige una contraseña nueva larga, distinta y confirmada', () => {
  assert.equal(adminProfilePasswordSchema.safeParse({
    confirmPassword: 'new-secure-password',
    currentPassword: 'current-password',
    newPassword: 'new-secure-password',
  }).success, true)
  assert.equal(adminProfilePasswordSchema.safeParse({
    confirmPassword: 'different-password',
    currentPassword: 'current-password',
    newPassword: 'short',
  }).success, false)
  assert.equal(adminProfilePasswordSchema.safeParse({
    confirmPassword: 'same-password',
    currentPassword: 'same-password',
    newPassword: 'same-password',
  }).success, false)
})
