import type { BaseQueryFn } from '@reduxjs/toolkit/query/react'
import { describe, expect, it } from 'vitest'
import type { ContentMap } from './parseContent'
import { withWrittenText } from './writtenText'

const map: ContentMap = { known: { title: 'Written title', content: 'Written body' } }
const load = () => Promise.resolve(map)
const failing = () => Promise.reject(new Error('chunk failed'))
const api = {} as Parameters<BaseQueryFn>[1]

const run = (reply: ReturnType<BaseQueryFn> | Awaited<ReturnType<BaseQueryFn>>, loader = load) =>
  withWrittenText((() => Promise.resolve(reply)) as BaseQueryFn, loader)('/posts/', api, {})

describe('withWrittenText', () => {
  it('swaps the title and the body of a post by its id and keeps the rest', async () => {
    const result = await run({ data: [{ id: 'known', title: 'API', content: 'lorem', author: 'A' }] })
    expect(result).toEqual({ data: [{ id: 'known', title: 'Written title', content: 'Written body', author: 'A' }] })
  })

  it('leaves a post with an unknown id, and an item that is not an object, as they came', async () => {
    const data = [{ id: 'other', title: 'API', content: 'lorem' }, null, 'text', { title: 'no id' }]
    expect(await run({ data })).toEqual({ data })
  })

  it('leaves a body that is not a list as it came', async () => {
    const reply = { data: { id: 'known', title: 'API', content: 'lorem' } }
    expect(await run(reply)).toEqual(reply)
  })

  it('leaves an error as it came', async () => {
    const reply = { error: { status: 500, data: 'boom' } }
    expect(await run(reply)).toEqual(reply)
  })

  it('keeps the answer of the API when the chunk fails', async () => {
    const reply = { data: [{ id: 'known', title: 'API', content: 'lorem' }] }
    expect(await run(reply, failing)).toEqual(reply)
  })
})
