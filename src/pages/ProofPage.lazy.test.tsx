import { screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

// The import of the page has two states to test, rejected and pending, so each
// one mocks the module ./ProofPage.tsx on its own and loads the app routes
// again, after vi.resetModules(), with the mock in place.

type Factory = () => Record<string, unknown> | Promise<Record<string, unknown>>

async function renderWithProofPage(factory: Factory) {
  vi.resetModules()
  vi.doMock('./ProofPage.tsx', factory)
  const { renderApp } = await import('../test/renderApp')
  return renderApp('/proof')
}

it('C24 shows The bug hunt could not load. with a Reload button when the import is rejected, and Loading the bug hunt… while it is pending', async () => {
  // React reports the error the boundary catches on the console.
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const pending = await renderWithProofPage(
      () => new Promise<Record<string, unknown>>(() => {}),
    )
    expect(await screen.findByText('Loading the bug hunt…')).toBeInTheDocument()
    expect(screen.queryByText('The bug hunt could not load.')).not.toBeInTheDocument()
    pending.unmount()

    await renderWithProofPage(() => {
      throw new Error('the chunk did not load')
    })
    expect(await screen.findByText('The bug hunt could not load.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.queryByText('Loading the bug hunt…')).not.toBeInTheDocument()
  } finally {
    quiet.mockRestore()
    vi.doUnmock('./ProofPage.tsx')
  }
})
