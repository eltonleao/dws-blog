import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { renderLocalized } from '../../test/renderLocalized'
import { setViewport } from '../../test/setup'

const POST_ROUTE = '/posts/cc8a8c63-2f82-4745-8b6e-28f88ff73fdd'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  document.documentElement.lang = ''
})

// The group is the one element with role="group" that holds the English button.
function switchGroup(): HTMLElement {
  const group = screen
    .queryAllByRole('group')
    .find((candidate) => within(candidate).queryByRole('button', { name: 'English' }) !== null)
  if (!group) throw new Error('No role="group" holds the English button')
  return group
}

const englishButton = () => within(switchGroup()).getByRole('button', { name: 'English' })
const spanishButton = () => within(switchGroup()).getByRole('button', { name: 'Español' })

it('L10 draws a named group with the buttons English and Español, showing EN and ES, at both breakpoints', async () => {
  for (const viewport of ['desktop', 'mobile'] as const) {
    setViewport(viewport)
    const { unmount } = renderLocalized('/nao-existe')
    await screen.findByRole('heading', { level: 1 })

    expect(switchGroup(), `${viewport}: the group has a name`).toHaveAccessibleName(/\S/)
    expect(englishButton(), `${viewport}: English shows EN`).toHaveTextContent(/^EN$/)
    expect(spanishButton(), `${viewport}: Español shows ES`).toHaveTextContent(/^ES$/)
    expect(within(switchGroup()).getAllByRole('button'), `${viewport}: two buttons`).toHaveLength(2)

    unmount()
  }
})

it('L10 marks the current language with aria-pressed and moves the mark on a click, with the names unchanged', async () => {
  const user = userEvent.setup()
  renderLocalized('/nao-existe')
  await screen.findByRole('heading', { level: 1 })

  expect(englishButton()).toHaveAttribute('aria-pressed', 'true')
  expect(spanishButton()).toHaveAttribute('aria-pressed', 'false')

  await user.click(spanishButton())

  expect(spanishButton()).toHaveAttribute('aria-pressed', 'true')
  expect(englishButton()).toHaveAttribute('aria-pressed', 'false')
  expect(englishButton(), 'the name stays English in Spanish').toHaveTextContent(/^EN$/)
})

it('L10 activates a language with Enter and with Space, and the focus stays on the button', async () => {
  const user = userEvent.setup()
  renderLocalized('/nao-existe')
  await screen.findByRole('heading', { level: 1 })

  spanishButton().focus()
  await user.keyboard('{Enter}')
  expect(spanishButton()).toHaveAttribute('aria-pressed', 'true')
  expect(spanishButton(), 'focus after Enter').toHaveFocus()

  englishButton().focus()
  await user.keyboard(' ')
  expect(englishButton()).toHaveAttribute('aria-pressed', 'true')
  expect(englishButton(), 'focus after Space').toHaveFocus()
})

it('L10 does not scroll to the top nor mount the page again when the language changes on a post', async () => {
  const user = userEvent.setup()
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const scrollY = Object.getOwnPropertyDescriptor(window, 'scrollY')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 400 })
  try {
    renderLocalized(POST_ROUTE)
    const title = await screen.findByRole('heading', { level: 1 })
    const main = screen.getByRole('main')
    scrollTo.mockClear()

    await user.click(spanishButton())
    await waitFor(() => expect(spanishButton()).toHaveAttribute('aria-pressed', 'true'))

    expect(main.isConnected, 'the main element is still the same one in the page').toBe(true)
    expect(screen.getByRole('main')).toBe(main)
    expect(screen.getByRole('heading', { level: 1 }), 'the title element is the same one').toBe(title)
    expect(scrollTo, 'no scroll to the top').not.toHaveBeenCalled()
  } finally {
    scrollTo.mockRestore()
    if (scrollY) Object.defineProperty(window, 'scrollY', scrollY)
    else Reflect.deleteProperty(window, 'scrollY')
  }
})
