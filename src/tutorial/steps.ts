import type { SortOrder } from '../features/posts/types'
import type { TutorialProgress } from './tutorialMode'

export const REPO_URL = 'https://github.com/eltonleao/dws-blog'

/** How long the search has to stay the same before step 1 counts it as typed. */
export const SETTLE_MS = 700

/** What the tour reads of the app on each render. */
export interface Seen {
  categories: number
  order: SortOrder
  pathname: string
  desktop: boolean
}

/** The element of the page the ghost pointer goes to. */
export type Target = 'search' | 'category' | 'sort' | 'post' | 'back'

export interface Step {
  /** Asked before the action: the action answers it. */
  question: string
  /** Shown after the action, in three sentences at most. */
  explanation: string
  /** The file of the repository that does what the step shows. */
  file: string
}

export const STEPS: Step[] = [
  {
    question: 'Does the search care about capital letters?',
    explanation:
      'It does not. Before comparing, normalize() turns both sides to NFD, drops the accents and lowers the case, so TECHNOLOGY, technology and téchnology find the same posts.',
    file: 'src/lib/normalize.ts',
  },
  {
    question: 'Where does the list keep your filters?',
    explanation:
      'In the URL. The list writes the search, the filters and the order to the query string, and main.tsx builds the store from it when the page loads: that is why the reload kept your filter, and why the link can be shared.',
    file: 'src/features/browse/browseUrl.ts',
  },
  {
    question: 'Does sorting ask the API again?',
    explanation:
      'No. The 26 posts came in one request, and sortPosts reorders them in the browser, with the place of each post in the API answer as the tie-breaker. The count of requests above did not move.',
    file: 'src/features/posts/sortPosts.ts',
  },
  {
    question: 'Does opening a post download it?',
    explanation:
      'No. The post page reads the same RTK Query cache the list filled, so the post shows at once and the count of requests stays where it was. Only a post opened straight from a link asks the API, once.',
    file: 'src/pages/PostPage.tsx',
  },
  {
    question: 'Who decides between the sidebar and the dropdowns?',
    explanation:
      'One media query, (min-width: 1024px). useMediaQuery reads it with useSyncExternalStore, so React swaps the sidebar for the dropdowns at the same width the CSS changes.',
    file: 'src/lib/useMediaQuery.ts',
  },
]

/** What the reader is asked to do now. */
export function actionOf(progress: TutorialProgress, seen: Seen): string {
  switch (progress.step) {
    case 0:
      return 'Type TECHNOLOGY, in capitals, in the search.'
    case 1:
      if (progress.filterChosen) return 'Now reload the page.'
      return seen.desktop
        ? 'Pick a category in the filters and apply it.'
        : 'Pick a category in the filters.'
    case 2:
      return seen.pathname === '/'
        ? 'Press the sort button.'
        : 'Go back to the list, then press the sort button.'
    case 3:
      return progress.visitedPost ? 'Now go back with Back.' : 'Open any post.'
    default:
      return progress.desktopBefore === false
        ? 'Make the window wider than 1024 px. On a phone, skip this one.'
        : 'Make the window narrower than 1024 px.'
  }
}

/**
 * The progress after what the app shows now: a step whose action happened
 * gets its explanation. The same object comes back when nothing changed, so
 * the tour can call this on every render.
 */
export function advance(progress: TutorialProgress, seen: Seen): TutorialProgress {
  if (progress.explained) return progress
  switch (progress.step) {
    case 1:
      return !progress.filterChosen && seen.categories > 0
        ? { ...progress, filterChosen: true }
        : progress
    case 2:
      if (progress.orderBefore === null) return { ...progress, orderBefore: seen.order }
      return seen.order !== progress.orderBefore ? { ...progress, explained: true } : progress
    case 3:
      if (seen.pathname.startsWith('/posts/')) {
        return progress.visitedPost ? progress : { ...progress, visitedPost: true }
      }
      return progress.visitedPost && seen.pathname === '/'
        ? { ...progress, explained: true }
        : progress
    case 4:
      if (progress.desktopBefore === null) return { ...progress, desktopBefore: seen.desktop }
      return seen.desktop !== progress.desktopBefore ? { ...progress, explained: true } : progress
    default:
      return progress
  }
}

/**
 * The progress as the page loads: step 2 ends with a reload, and it counts
 * only when a category was picked before it and is still there after.
 */
export function resumeAfterLoad(
  progress: TutorialProgress,
  { reloaded, categories }: { reloaded: boolean; categories: number },
): TutorialProgress {
  const kept = progress.step === 1 && progress.filterChosen && reloaded && categories > 0
  return kept && !progress.explained ? { ...progress, explained: true } : progress
}

/** Where the ghost goes, or null when the action is not on the page. */
export function targetOf(progress: TutorialProgress, pathname: string): Target | null {
  if (progress.explained) return null
  switch (progress.step) {
    case 0:
      return 'search'
    case 1:
      return progress.filterChosen ? null : 'category'
    case 2:
      return pathname === '/' ? 'sort' : null
    case 3:
      return pathname.startsWith('/posts/') ? 'back' : 'post'
    default:
      return null
  }
}
