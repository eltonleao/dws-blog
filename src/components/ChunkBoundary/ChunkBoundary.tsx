import { Component, type ReactNode } from 'react'
import { Button } from '../Button/Button'
import { StatusMessage } from '../StatusMessage/StatusMessage'

interface ChunkBoundaryProps {
  /** The page that loads in a chunk of its own, inside its Suspense. */
  children: ReactNode
}

interface ChunkBoundaryState {
  failed: boolean
}

/**
 * What the bug hunt shows when its chunk does not load, offline or after a
 * deploy that replaced it: a message and Reload, instead of a blank page.
 */
export class ChunkBoundary extends Component<ChunkBoundaryProps, ChunkBoundaryState> {
  state: ChunkBoundaryState = { failed: false }

  static getDerivedStateFromError(): ChunkBoundaryState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <StatusMessage role="alert" message="The bug hunt could not load.">
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </StatusMessage>
      )
    }
    return this.props.children
  }
}
