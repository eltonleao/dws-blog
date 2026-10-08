import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST, comment, openForm, renderPost } from '../test/commentsPage'
import { installSupabase } from '../test/supabaseMock'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the anonymous visitor', () => {
  it('S9 the first comment creates the visitor and posts under its name; the second reuses the session with one signup', async () => {
    const mock = installSupabase()
    renderPost()

    const { user, field } = await comment('First comment')
    await waitFor(() => expect(mock.inserts).toHaveLength(1))
    expect(mock.signups, 'one signup for the first comment').toHaveLength(1)

    const [first] = mock.inserts
    expect(first.body.display_name).toMatch(/^Visitor \d{4}$/)
    expect(first.body.body).toBe('First comment')
    expect(first.body.post_id).toBe(POST.id)
    expect(Object.keys(first.body).sort(), 'only the columns the client may write').toEqual([
      'body',
      'display_name',
      'post_id',
    ])
    expect(first.authorization, 'the insert goes out with the session of the visitor').toBe(`Bearer ${mock.tokens[0]}`)
    expect(mock.signups[0].data?.display_name, 'the name sent to signup is the one on the comment').toBe(
      first.body.display_name,
    )

    expect(await screen.findByText('First comment')).toBeInTheDocument()
    await waitFor(() => expect(field).toHaveValue(''))

    await user.type(field, 'Second comment')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    await waitFor(() => expect(mock.inserts).toHaveLength(2))
    expect(mock.signups, 'the second comment reuses the session').toHaveLength(1)
    expect(mock.inserts[1].body.display_name).toBe(first.body.display_name)
    expect(mock.inserts[1].authorization).toBe(first.authorization)
  })

  it('S10 Leave ends the session, the next comment is born with another name, and the old ones stay', async () => {
    const mock = installSupabase()
    renderPost()

    const { user, field } = await comment('Before leaving')
    expect(await screen.findByText('Before leaving')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(mock.logouts).toBe(1))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument())
    expect(screen.getByText('Before leaving'), 'the old comment stays').toBeInTheDocument()

    await user.type(field, 'After leaving')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    await waitFor(() => expect(mock.inserts).toHaveLength(2))
    expect(mock.signups, 'a new visitor').toHaveLength(2)
    const [before, after] = mock.inserts.map((insert) => insert.body.display_name)
    expect(after).toMatch(/^Visitor \d{4}$/)
    // Four random digits: the same name twice in a row is one chance in nine thousand.
    expect(after, 'another name').not.toBe(before)
    expect(mock.inserts[1].authorization).toBe(`Bearer ${mock.tokens[1]}`)
    expect(await screen.findByText('Before leaving')).toBeInTheDocument()
    expect(await screen.findByText('After leaving')).toBeInTheDocument()
  })

  it('S11 anonymous sign-ins turned off (422) show the error, keep the text and send no insert', async () => {
    const mock = installSupabase()
    mock.signupStatus = 422
    renderPost()

    const { field } = await comment('Do not lose this')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not start your visitor session')
    expect(field).toHaveValue('Do not lose this')
    expect(mock.signups).toHaveLength(1)
    expect(mock.inserts, 'no insert without a session').toHaveLength(0)
    expect((await openForm()).send, 'the button is back').toBeEnabled()
  })

  it('S9 the field has a label and a counter of characters', async () => {
    installSupabase()
    renderPost()

    const { field } = await openForm()
    expect(screen.getByText('0/500')).toBeInTheDocument()
    await userEvent.type(field, 'hello')
    expect(screen.getByText('5/500')).toBeInTheDocument()
  })
})
