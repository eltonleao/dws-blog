import { expect, it } from 'vitest'
import { advance, resumeAfterLoad, targetOf, type Seen } from './steps'
import { progressAt } from './tutorialMode'

const LIST: Seen = { categories: 0, order: 'newest', pathname: '/', desktop: true }

it('T6 step 2 counts a chosen category, and only a reload that kept it explains the step', () => {
  const chosen = advance(progressAt(1), { ...LIST, categories: 1 })
  expect(chosen).toMatchObject({ filterChosen: true, explained: false })

  expect(resumeAfterLoad(chosen, { reloaded: true, categories: 1 }).explained).toBe(true)
  expect(resumeAfterLoad(chosen, { reloaded: false, categories: 1 }).explained).toBe(false)
  expect(resumeAfterLoad(chosen, { reloaded: true, categories: 0 }).explained).toBe(false)
  // Without a category chosen first, a reload explains nothing.
  expect(resumeAfterLoad(progressAt(1), { reloaded: true, categories: 1 }).explained).toBe(false)
})

it('T7 step 3 keeps the order it began with and is explained when the order changes', () => {
  const begun = advance(progressAt(2), LIST)
  expect(begun.orderBefore).toBe('newest')
  expect(advance(begun, LIST)).toBe(begun)

  expect(advance(begun, { ...LIST, order: 'oldest' }).explained).toBe(true)
  // The order the step was given at its start wins over a later render.
  expect(advance(progressAt(2, { order: 'oldest' }), LIST).explained).toBe(true)
})

it('T8 step 4 needs the post and then the way back to the list', () => {
  const onPost = advance(progressAt(3), { ...LIST, pathname: '/posts/abc' })
  expect(onPost).toMatchObject({ visitedPost: true, explained: false })
  expect(advance(onPost, { ...LIST, pathname: '/posts/abc' })).toBe(onPost)

  expect(advance(onPost, LIST).explained).toBe(true)
  expect(advance(onPost, { ...LIST, pathname: '/proof' }).explained).toBe(false)
  expect(advance(progressAt(3), LIST).explained).toBe(false)
})

it('T9 step 5 is explained when the layout crosses 1024 px, either way', () => {
  const wide = advance(progressAt(4), LIST)
  expect(wide.desktopBefore).toBe(true)
  expect(advance(wide, { ...LIST, desktop: false }).explained).toBe(true)

  const narrow = progressAt(4, { desktop: false })
  expect(advance(narrow, { ...LIST, desktop: false })).toBe(narrow)
  expect(advance(narrow, LIST).explained).toBe(true)
})

it('T10 an explained step, the first step and the closing card do not move on render', () => {
  const explained = { ...progressAt(2), explained: true }
  expect(advance(explained, { ...LIST, order: 'oldest' })).toBe(explained)

  // The search is settled by a timer, never by a render.
  const typing = progressAt(0)
  expect(advance(typing, LIST)).toBe(typing)
  const closing = progressAt(5)
  expect(advance(closing, LIST)).toBe(closing)
})

it('T11 the ghost goes where the action is, and nowhere once the step is explained', () => {
  expect(targetOf(progressAt(0), '/')).toBe('search')
  expect(targetOf(progressAt(1), '/')).toBe('category')
  expect(targetOf({ ...progressAt(1), filterChosen: true }, '/')).toBeNull()
  expect(targetOf(progressAt(2), '/')).toBe('sort')
  expect(targetOf(progressAt(2), '/posts/abc')).toBeNull()
  expect(targetOf(progressAt(3), '/')).toBe('post')
  expect(targetOf(progressAt(3), '/posts/abc')).toBe('back')
  expect(targetOf(progressAt(4), '/')).toBeNull()
  expect(targetOf({ ...progressAt(0), explained: true }, '/')).toBeNull()
})
