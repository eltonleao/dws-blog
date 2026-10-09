import { beforeEach, expect, it } from 'vitest'
import {
  exitTutorial,
  progressAt,
  readProgress,
  saveProgress,
  startTutorialMode,
  TUTORIAL_KEY,
  tutorialAtBoot,
} from './tutorialMode'

beforeEach(() => {
  sessionStorage.clear()
})

it('T1 ?mode=tutorial turns the tour on and saves its first step in the tab', () => {
  expect(startTutorialMode('?mode=tutorial', sessionStorage)).toBe(true)
  expect(tutorialAtBoot()).toBe(true)
  expect(readProgress(sessionStorage)).toEqual(progressAt(0))
})

it('T2 without the parameter and without a saved tour, the tour stays off', () => {
  expect(startTutorialMode('?q=emily&order=oldest', sessionStorage)).toBe(false)
  expect(tutorialAtBoot()).toBe(false)
  expect(sessionStorage.getItem(TUTORIAL_KEY)).toBeNull()
})

it('T3 a saved tour goes on after the URL lost the parameter, at the step it was', () => {
  saveProgress(sessionStorage, { ...progressAt(2), orderBefore: 'newest' })

  expect(startTutorialMode('', sessionStorage)).toBe(true)
  expect(readProgress(sessionStorage)).toMatchObject({ step: 2, orderBefore: 'newest' })
  // Asking again resumes the tour instead of starting it over.
  startTutorialMode('?mode=tutorial', sessionStorage)
  expect(readProgress(sessionStorage)?.step).toBe(2)
})

it('T4 exiting forgets the tour, so the next load has none', () => {
  startTutorialMode('?mode=tutorial', sessionStorage)
  exitTutorial(sessionStorage)

  expect(sessionStorage.getItem(TUTORIAL_KEY)).toBeNull()
  expect(startTutorialMode('', sessionStorage)).toBe(false)
})

it('T5 a broken or blocked storage leaves the tour off instead of throwing', () => {
  sessionStorage.setItem(TUTORIAL_KEY, '{not json')
  expect(readProgress(sessionStorage)).toBeNull()
  sessionStorage.setItem(TUTORIAL_KEY, '{"step":"two"}')
  expect(readProgress(sessionStorage)).toBeNull()

  expect(startTutorialMode('?mode=tutorial', null)).toBe(true)
  expect(startTutorialMode('', null)).toBe(false)
})
