import '@testing-library/jest-dom/vitest'
import { act, cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

// A fixed time zone keeps date formatting independent of the machine running
// the suite: 2026-09-19T02:26:27Z is still the 18th in São Paulo.
process.env.TZ = 'America/Sao_Paulo'

export type Viewport = 'mobile' | 'desktop'

const VIEWPORTS: Record<Viewport, { width: number; height: number }> = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 },
}

type ChangeListener = (event: MediaQueryListEvent) => void

interface FakeMediaQuery {
  list: MediaQueryList
  listeners: Set<ChangeListener>
}

const mediaQueries = new Map<string, FakeMediaQuery>()

// jsdom has no layout, so a media query is answered from the viewport width.
// Only `(min-width: Npx)` and `(max-width: Npx)` conditions, joined by `and`,
// are understood; anything else does not match.
function evaluate(query: string, width: number): boolean {
  return query.split(/\s+and\s+/i).every((condition) => {
    const match = /^\(\s*(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)$/i.exec(
      condition.trim(),
    )
    if (!match) return false
    const limit = Number(match[2])
    return match[1].toLowerCase() === 'min' ? width >= limit : width <= limit
  })
}

function createMediaQuery(query: string): FakeMediaQuery {
  const listeners = new Set<ChangeListener>()
  const list = {
    media: query,
    // Always read from the current width, so a snapshot taken after
    // setViewport() is up to date.
    get matches() {
      return evaluate(query, window.innerWidth)
    },
    onchange: null,
    addEventListener: (type: string, listener: ChangeListener) => {
      if (type === 'change') listeners.add(listener)
    },
    removeEventListener: (type: string, listener: ChangeListener) => {
      if (type === 'change') listeners.delete(listener)
    },
    addListener: (listener: ChangeListener) => {
      listeners.add(listener)
    },
    removeListener: (listener: ChangeListener) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => false,
  } as unknown as MediaQueryList
  return { list, listeners }
}

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList => {
    let entry = mediaQueries.get(query)
    if (!entry) {
      entry = createMediaQuery(query)
      mediaQueries.set(query, entry)
    }
    return entry.list
  },
})

function applyViewport(viewport: Viewport) {
  const { width, height } = VIEWPORTS[viewport]
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  })
}

/**
 * Switches the simulated viewport (375 or 1440 wide) and notifies the
 * listeners of every media query whose answer changed. Every test starts on
 * the desktop viewport.
 */
export function setViewport(viewport: Viewport) {
  const before = new Map<string, boolean>()
  for (const query of mediaQueries.keys()) {
    before.set(query, evaluate(query, window.innerWidth))
  }
  applyViewport(viewport)
  act(() => {
    window.dispatchEvent(new Event('resize'))
    for (const [query, { listeners }] of mediaQueries) {
      const matches = evaluate(query, window.innerWidth)
      if (matches === before.get(query)) continue
      for (const listener of listeners) {
        listener({ matches, media: query } as MediaQueryListEvent)
      }
    }
  })
}

applyViewport('desktop')

beforeAll(() => {
  // A request without a handler is a test bug, not something to let through.
  // MSW 3 calls this option onUnhandledFrame (it was onUnhandledRequest).
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  applyViewport('desktop')
})

afterAll(() => {
  server.close()
})
