import { Component, lazy, Suspense, type ReactNode } from 'react'
import { tutorialAtBoot } from './tutorialMode'

const Tutorial = lazy(() => import('./Tutorial.tsx').then((module) => ({ default: module.Tutorial })))

interface QuietBoundaryState {
  failed: boolean
}

/** A tour that fails to load leaves the blog as it was: no message, no tour. */
class QuietBoundary extends Component<{ children: ReactNode }, QuietBoundaryState> {
  state: QuietBoundaryState = { failed: false }

  static getDerivedStateFromError(): QuietBoundaryState {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Where the tour goes in the layout. Off, it renders nothing and the tour's
 * chunk is never requested; on, the chunk loads after the page.
 */
export function TutorialSlot() {
  if (!tutorialAtBoot()) return null
  return (
    <QuietBoundary>
      <Suspense fallback={null}>
        <Tutorial />
      </Suspense>
    </QuietBoundary>
  )
}
