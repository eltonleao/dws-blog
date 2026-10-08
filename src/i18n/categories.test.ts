import { expect, it } from 'vitest'
import { categoryLabel } from './categories'

it('L7 labels the six categories in Spanish and leaves the English label as the API name', () => {
  const labels = {
    Technology: 'Tecnología',
    Science: 'Ciencia',
    Sports: 'Deportes',
    Travel: 'Viajes',
    Food: 'Comida',
    Fashion: 'Moda',
  }
  for (const [name, spanish] of Object.entries(labels)) {
    expect(categoryLabel(name, 'es'), `${name} in es`).toBe(spanish)
    expect(categoryLabel(name, 'en'), `${name} in en`).toBe(name)
  }
})

it('L7 returns a category it does not know as it came, in both languages', () => {
  for (const name of ['Gardening', 'technology', '', 'Tecnología']) {
    expect(categoryLabel(name, 'es'), `"${name}" in es`).toBe(name)
    expect(categoryLabel(name, 'en'), `"${name}" in en`).toBe(name)
  }
})
