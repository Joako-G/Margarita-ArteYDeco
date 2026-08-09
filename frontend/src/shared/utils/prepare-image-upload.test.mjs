import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CATEGORY_IMAGE_MAX_DIMENSION,
  calculateImageDimensions,
  PRODUCT_IMAGE_MAX_DIMENSION,
} from './prepare-image-upload.ts'

test('reduce una imagen horizontal al máximo de producto sin recortarla', () => {
  assert.deepEqual(
    calculateImageDimensions(2_400, 1_200, PRODUCT_IMAGE_MAX_DIMENSION),
    { height: 800, width: 1_600 },
  )
})

test('reduce una imagen vertical al máximo de categoría conservando la proporción', () => {
  assert.deepEqual(
    calculateImageDimensions(1_200, 2_400, CATEGORY_IMAGE_MAX_DIMENSION),
    { height: 1_200, width: 600 },
  )
})

test('no amplía imágenes que ya están dentro del límite', () => {
  assert.deepEqual(calculateImageDimensions(640, 480, PRODUCT_IMAGE_MAX_DIMENSION), {
    height: 480,
    width: 640,
  })
})
