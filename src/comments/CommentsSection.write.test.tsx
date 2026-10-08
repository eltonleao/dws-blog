import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST, comment, renderPost } from '../test/commentsPage'
import { installSupabase, row } from '../test/supabaseMock'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sending and deleting comments', () => {
  for (const [label, status] of [
    ['a 503', 503],
    ['a refusal by the policy (42501)', 403],
  ] as const) {
    it(`S14 an insert answered with ${label} keeps the text, frees the button and asks to try again in a minute`, async () => {
    const mock = installSupabase()
    mock.insertStatus = status
    renderPost()

    const { field, send } = await comment('Please keep me')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/try again in a minute/i)
    expect(field).toHaveValue('Please keep me')
    expect(send).toBeEnabled()
    expect(mock.inserts).toHaveLength(1)
    })
  }

  it('S15 a double click sends one insert and the button stays disabled while it sends', async () => {
    const mock = installSupabase()
    mock.insertDelayMs = 300
    renderPost()

    const user = userEvent.setup()
    const field = await screen.findByRole('textbox', { name: 'Your comment' })
    const send = screen.getByRole('button', { name: 'Post comment' })
    await user.type(field, 'Only once')
    await user.dblClick(send)

    await waitFor(() => expect(send).toBeDisabled())
    await waitFor(() => expect(field).toHaveValue(''))
    expect(mock.inserts, 'one insert for two clicks').toHaveLength(1)
    expect(mock.signups, 'one visitor').toHaveLength(1)
    await waitFor(() => expect(send).toBeEnabled())
  })

  it('S18 Delete shows only on the comments of the current user, and deleting removes the comment at once', async () => {
    const mock = installSupabase([
      row({ post_id: POST.id, body: 'Comment of someone else', created_at: '2026-10-01T10:00:00.000Z' }),
    ])
    renderPost()

    expect(await screen.findByText('Comment of someone else')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete comment' }), 'no session, nothing to delete').not.toBeInTheDocument()

    const { user } = await comment('My own comment')
    expect(await screen.findByText('My own comment')).toBeInTheDocument()
    const buttons = await screen.findAllByRole('button', { name: 'Delete comment' })
    expect(buttons, 'only the comment of the visitor can be deleted').toHaveLength(1)

    let release: () => void = () => {}
    mock.deleteGate = new Promise<void>((resolve) => {
      release = resolve
    })
    await user.click(buttons[0])
    await waitFor(() => expect(screen.queryByText('My own comment')).not.toBeInTheDocument())
    expect(mock.comments.some((stored) => stored.body === 'My own comment'), 'the server has not answered yet').toBe(true)
    release()
    await waitFor(() => expect(mock.deletes).toHaveLength(1))
    expect(mock.deletes[0].searchParams.get('id')).toMatch(/^eq\./)
    expect(screen.getByText('Comment of someone else')).toBeInTheDocument()
    expect(screen.queryByText('My own comment')).not.toBeInTheDocument()
  })

  it('S18 a failed delete brings the comment back', async () => {
    const mock = installSupabase()
    renderPost()

    const { user } = await comment('Stays after a failure')
    expect(await screen.findByText('Stays after a failure')).toBeInTheDocument()
    const [remove] = await screen.findAllByRole('button', { name: 'Delete comment' })
    mock.deleteStatus = 500
    await user.click(remove)

    await waitFor(() => expect(mock.deletes.length).toBeGreaterThan(0))
    expect(await screen.findByText('Stays after a failure')).toBeInTheDocument()
    expect(within(document.body).getAllByRole('button', { name: 'Delete comment' })).toHaveLength(1)
  })
})
