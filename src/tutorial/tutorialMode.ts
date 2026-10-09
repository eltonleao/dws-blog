import type { SortOrder } from '../features/posts/types'

/**
 * The tutorial mode: `?mode=tutorial` turns it on, and the tab keeps it in
 * sessionStorage. The URL cannot hold it: the list rewrites the query string
 * on its first render, and reloading the page is one of the steps.
 */
export const TUTORIAL_KEY = 'dws-blog:tutorial'

/** Where the reader is in the tour, and what the current step has seen so far. */
export interface TutorialProgress {
  /** 0 to 4 for the five steps, 5 for the closing card. */
  step: number
  /** The step's action happened, and its explanation is showing. */
  explained: boolean
  /** Step 1: the search the reader typed. */
  typed: string
  /** Step 2: a category was chosen, so the next reload counts. */
  filterChosen: boolean
  /** Step 4: the reader has opened a post. */
  visitedPost: boolean
  /** Step 3: the order of the list when the step began. */
  orderBefore: SortOrder | null
  /** Step 5: whether the desktop layout was on when the step began. */
  desktopBefore: boolean | null
}

export const STEP_COUNT = 5

/** A step as it begins, with what the list and the window are like at that moment. */
export function progressAt(
  step: number,
  { order = null, desktop = null }: { order?: SortOrder | null; desktop?: boolean | null } = {},
): TutorialProgress {
  return {
    step,
    explained: false,
    typed: '',
    filterChosen: false,
    visitedPost: false,
    orderBefore: order,
    desktopBefore: desktop,
  }
}

/** The tab's sessionStorage, or null where reading it throws (storage blocked). */
export function sessionStore(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function readProgress(storage: Storage | null): TutorialProgress | null {
  try {
    const saved = storage?.getItem(TUTORIAL_KEY)
    if (!saved) return null
    const progress = JSON.parse(saved) as Partial<TutorialProgress>
    if (typeof progress.step !== 'number') return null
    return { ...progressAt(progress.step), ...progress }
  } catch {
    return null
  }
}

export function saveProgress(storage: Storage | null, progress: TutorialProgress): void {
  try {
    storage?.setItem(TUTORIAL_KEY, JSON.stringify(progress))
  } catch {
    // A full or blocked storage keeps the tour for this page only.
  }
}

export function exitTutorial(storage: Storage | null): void {
  try {
    storage?.removeItem(TUTORIAL_KEY)
  } catch {
    // Nothing was kept, so there is nothing to forget.
  }
}

let activeAtBoot = false

/**
 * Read once, before the first render: `?mode=tutorial` starts the tour (or
 * resumes it, when the tab already has one), and a saved tour goes on after
 * the list has cleaned the URL or the page was reloaded. Without either, the
 * tour stays out of the page, and its code is never downloaded.
 */
export function startTutorialMode(search: string, storage: Storage | null): boolean {
  const asked = new URLSearchParams(search).get('mode') === 'tutorial'
  if (asked && readProgress(storage) === null) saveProgress(storage, progressAt(0))
  activeAtBoot = asked || readProgress(storage) !== null
  return activeAtBoot
}

/** Whether the tour was on when the page loaded. */
export function tutorialAtBoot(): boolean {
  return activeAtBoot
}
