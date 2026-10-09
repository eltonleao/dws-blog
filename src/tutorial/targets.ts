import type { Target } from './steps'

/**
 * The first of `elements` that is drawn and in the window, or else the first
 * that is drawn. The tour finds its targets the way the e2e does, by role
 * and by name, so the components carry nothing for it.
 */
function onScreen(elements: Iterable<Element>): HTMLElement | null {
  let drawn: HTMLElement | null = null
  for (const element of elements) {
    const box = element.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue
    if (box.bottom > 0 && box.top < window.innerHeight) return element as HTMLElement
    drawn ??= element as HTMLElement
  }
  return drawn
}

function withText(pattern: RegExp): Element[] {
  return Array.from(document.querySelectorAll('button, a')).filter((element) =>
    pattern.test(element.textContent?.trim() ?? ''),
  )
}

/** The element of the page that `target` names now, or null when it is not there. */
export function findTarget(target: Target): HTMLElement | null {
  switch (target) {
    case 'search':
      // The field of the open search panel first: on mobile, the header
      // button sits under it.
      return (
        onScreen(document.querySelectorAll('input[type="search"]')) ??
        onScreen(document.querySelectorAll('button[aria-label="Search"]'))
      )
    case 'category':
      // On desktop a picked category waits for Apply filters.
      if (document.querySelector('button[aria-pressed="true"]') !== null) {
        return onScreen(withText(/^Apply filters$/))
      }
      return (
        onScreen(document.querySelectorAll('button[aria-pressed]')) ??
        onScreen(document.querySelectorAll('button[aria-haspopup="listbox"]'))
      )
    case 'sort':
      return onScreen(withText(/ first$/))
    case 'post':
      return onScreen(document.querySelectorAll('a[href^="/posts/"]'))
    case 'back':
      return onScreen(withText(/^Back$/))
  }
}
