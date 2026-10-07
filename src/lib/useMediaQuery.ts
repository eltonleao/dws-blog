import { useSyncExternalStore } from 'react'

/**
 * The breakpoint of the design: from 1024 px on, the desktop layout. The CSS
 * modules switch at the same width, so the markup and the styles agree.
 */
export const DESKTOP_QUERY = '(min-width: 1024px)'

/** Whether `query` matches now, read from `matchMedia` and kept current on every change. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}
