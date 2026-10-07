import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { AREA_ORDER } from '../proof/areas.ts'
import { parseProof } from '../proof/parseProof.ts'
import rawProof from '../proof/proof.json'
import { renderApp } from '../test/renderApp'

const proof = parseProof(rawProof)
const total = proof.lines.length

const lineOf = (id: string) => {
  const line = proof.lines.find((candidate) => candidate.id === id)
  if (!line) throw new Error(`proof.json has no line ${id}`)
  return line
}

const cardButton = (id: string) =>
  screen.getByRole('button', { name: lineOf(id).test })

const counter = (area: string, opened: number, count: number) =>
  within(screen.getByRole('region', { name: area })).getByText(
    `${opened} of ${count} opened`,
  )

it('C22 shows on /proof the h1 with the count, the commit link, the 8 areas in order with 0 opened and one closed card per line', async () => {
  renderApp('/proof')

  await screen.findByRole('heading', {
    level: 1,
    name: `${total} of ${total} planted bugs caught`,
  })

  // The commit of the run links to GitHub.
  const commitLinks = screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href')?.endsWith(`/commit/${proof.commit}`))
  expect(commitLinks, 'one link to the commit').toHaveLength(1)

  // The areas, in the order of AREA_ORDER, each with its counter at zero.
  const areaHeadings = screen
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent?.trim())
  expect(areaHeadings).toEqual([...AREA_ORDER])
  for (const area of AREA_ORDER) {
    const count = proof.lines.filter((line) => line.area === area).length
    expect(counter(area, 0, count), `${area} starts at 0 of ${count}`).toBeInTheDocument()
  }

  // One closed card per line, named exactly like the title of its test.
  const closed = screen.getAllByRole('button', { expanded: false })
  expect(closed).toHaveLength(total)
  expect(closed.map((button) => button.getAttribute('aria-expanded'))).toEqual(
    Array(total).fill('false'),
  )
  expect(closed.map((button) => button.textContent?.trim()).sort()).toEqual(
    proof.lines.map((line) => line.test).sort(),
  )
  for (const button of closed) {
    expect(button, 'a card button controls its panel').toHaveAttribute('aria-controls')
  }
})

it('C23 opens a card on click, Enter and space, shows the change and the failure, and counts the cards opened at least once', async () => {
  const user = userEvent.setup()
  renderApp('/proof')
  await screen.findByRole('heading', { level: 1 })

  const sortCount = proof.lines.filter((line) => line.area === 'Sort').length
  expect(sortCount, 'the matrix has 4 lines in Sort').toBe(4)

  // Click on D1.
  const d1 = lineOf('D1')
  const button = cardButton('D1')
  await user.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  const card = button.closest('li')
  if (!card) throw new Error('the card button is not inside a list item')
  expect(within(card).getAllByText('Before').length).toBeGreaterThan(0)
  expect(within(card).getAllByText('After').length).toBeGreaterThan(0)
  const code = Array.from(card.querySelectorAll('pre code')).map(
    (element) => element.textContent ?? '',
  )
  expect(
    code.some((text) => text.includes(d1.changes[0].before)),
    'the code of the change before',
  ).toBe(true)
  expect(
    code.some((text) => text.includes(d1.changes[0].after)),
    'the code of the change after',
  ).toBe(true)
  expect(card.textContent ?? '').toContain(d1.failure[0])
  expect(counter('Sort', 1, sortCount)).toBeInTheDocument()

  // Closing keeps the card counted.
  await user.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(counter('Sort', 1, sortCount)).toBeInTheDocument()

  // Enter and space with the focus on the button do the same.
  const d2 = cardButton('D2')
  d2.focus()
  await user.keyboard('{Enter}')
  expect(d2).toHaveAttribute('aria-expanded', 'true')
  expect(counter('Sort', 2, sortCount)).toBeInTheDocument()

  const d3 = cardButton('D3')
  d3.focus()
  await user.keyboard(' ')
  expect(d3).toHaveAttribute('aria-expanded', 'true')
  expect(counter('Sort', 3, sortCount)).toBeInTheDocument()
})
