import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { API_URL, postsApi } from '../api/postsApi'
import { useAppSelector, useAppStore } from '../app/hooks'
import { Icon } from '../components/Icon/Icon'
import { searchPosts } from '../features/posts/searchPosts'
import type { Post } from '../features/posts/types'
import { normalize } from '../lib/normalize'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { Ghost } from './Ghost'
import {
  actionOf,
  advance,
  REPO_URL,
  resumeAfterLoad,
  SETTLE_MS,
  STEPS,
  targetOf,
  type Seen,
} from './steps'
import {
  exitTutorial,
  progressAt,
  readProgress,
  saveProgress,
  sessionStore,
  STEP_COUNT,
  type TutorialProgress,
} from './tutorialMode'
import styles from './Tutorial.module.css'

const storage = sessionStore()
const selectPostsResult = postsApi.endpoints.getPosts.select()
const NO_POSTS: Post[] = []

/** The requests this page made to the posts of the API, read from the browser's Resource Timing. */
function countApiRequests(): number {
  return performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.startsWith(`${API_URL}/posts`)).length
}

function subscribeToRequests(onChange: () => void): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {}
  const observer = new PerformanceObserver(onChange)
  observer.observe({ type: 'resource' })
  return () => observer.disconnect()
}

function subscribeToResize(onChange: () => void): () => void {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function pageWasReloaded(): boolean {
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  return navigation?.type === 'reload'
}

/**
 * The tour of `?mode=tutorial`: five questions about how the blog works, each
 * answered by something the reader does on the page, measured live, then
 * explained with the file that does it. It reads the app and never drives
 * it: no step blocks the page, every step can be skipped, and the card never
 * takes the focus.
 */
export function Tutorial() {
  const store = useAppStore()
  const [progress, setProgress] = useState<TutorialProgress | null>(() =>
    resumeAfterLoad(readProgress(storage) ?? progressAt(0), {
      reloaded: pageWasReloaded(),
      categories: store.getState().browse.categories.length,
    }),
  )
  const [collapsed, setCollapsed] = useState(false)
  const card = useRef<HTMLElement>(null)
  const { pathname, search: query } = useLocation()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const search = useAppSelector((state) => state.browse.search)
  const categories = useAppSelector((state) => state.browse.categories)
  const order = useAppSelector((state) => state.browse.order)
  const posts = useAppSelector((state) => selectPostsResult(state).data) ?? NO_POSTS
  const requests = useSyncExternalStore(subscribeToRequests, countApiRequests)
  const width = useSyncExternalStore(subscribeToResize, () => window.innerWidth)
  const seen: Seen = { categories: categories.length, order, pathname, desktop }

  // The step's action is read from the app as it renders, and the
  // explanation comes in the same pass.
  if (progress !== null) {
    const next = advance(progress, seen)
    if (next !== progress) setProgress(next)
  }

  // The search counts once the reader stops typing, so the explanation
  // speaks of the whole word and not of its first letter.
  const typing = progress?.step === 0 && !progress.explained ? search.trim() : ''
  useEffect(() => {
    if (typing === '') return
    const timer = setTimeout(() => {
      setProgress((current) =>
        current?.step === 0 ? { ...current, explained: true, typed: typing } : current,
      )
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [typing])

  useEffect(() => {
    if (progress !== null) saveProgress(storage, progress)
  }, [progress])

  if (progress === null) return null

  const { step } = progress
  const closing = step >= STEP_COUNT
  const target = closing ? null : targetOf(progress, pathname)
  const exit = () => {
    exitTutorial(storage)
    setProgress(null)
  }
  // Escape closes the tour only from inside the card: on the page it
  // already closes the search panel and the dropdowns.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    exit()
  }

  const measuresOfStep: [string, string][][] = [
    [
      ['You typed', search === '' ? '(nothing yet)' : search],
      ['Compared as', normalize(search) === '' ? '(nothing yet)' : normalize(search)],
      ['Posts found', String(searchPosts(posts, search).length)],
    ],
    [
      ['Query string', query === '' ? '(empty)' : decodeURIComponent(query)],
      ['Categories in the store', categories.length === 0 ? '(none)' : categories.join(', ')],
    ],
    [
      ['Order', order === 'newest' ? 'Newest first' : 'Oldest first'],
      ['Requests to the API', String(requests)],
    ],
    [
      ['Page', pathname],
      ['Requests to the API', String(requests)],
    ],
    [
      ['Window', `${width} px`],
      ['Layout', desktop ? 'Sidebar, from 1024 px' : 'Dropdowns, under 1024 px'],
    ],
  ]
  const measures = measuresOfStep[step] ?? []

  return (
    <>
      {target !== null && !collapsed ? (
        <Ghost key={`${step}:${target}`} target={target} from={card} />
      ) : null}
      <aside
        ref={card}
        aria-label="Tutorial"
        className={styles.card}
        data-collapsed={collapsed || undefined}
        onKeyDown={onKeyDown}
      >
        <div className={styles.top}>
          <p className={styles.count}>
            {closing ? 'Behind the scenes' : `Step ${step + 1} of ${STEP_COUNT}`}
          </p>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Minimize tutorial"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon name="chevron" className={styles.chevron} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Exit tutorial"
            onClick={exit}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {collapsed ? null : closing ? (
          <>
            <h2 className={styles.question}>That was the tour.</h2>
            <p className={styles.text}>
              Each of these behaviours has a test behind it. The proof page lists every
              requirement of the brief with the test that holds it.
            </p>
            <ul className={styles.links}>
              <li>
                <Link to="/proof">See the proof page</Link>
              </li>
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  Read the code on GitHub
                </a>
              </li>
            </ul>
            <div className={styles.actions}>
              <button type="button" className={styles.next} onClick={exit}>
                Close the tour
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.question}>{STEPS[step].question}</h2>
            {progress.explained ? null : (
              <p className={styles.action}>{actionOf(progress, seen)}</p>
            )}
            <dl className={styles.measures}>
              {measures.map(([label, value]) => (
                <div key={label} className={styles.measure}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div aria-live="polite" className={styles.explanation}>
              {progress.explained ? (
                <>
                  <p className={styles.text}>{STEPS[step].explanation}</p>
                  <a
                    className={styles.file}
                    href={`${REPO_URL}/blob/master/${STEPS[step].file}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {STEPS[step].file}
                  </a>
                </>
              ) : null}
            </div>
            <div className={styles.actions}>
              {/* One button that keeps its place and its focus: Skip, then Next. */}
              <button
                type="button"
                className={progress.explained ? styles.next : styles.skip}
                onClick={() => setProgress(progressAt(step + 1, { order, desktop }))}
              >
                {progress.explained ? 'Next' : 'Skip'}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
