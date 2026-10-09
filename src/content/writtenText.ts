import type { BaseQueryFn } from '@reduxjs/toolkit/query/react'
import type { ContentMap } from './parseContent.ts'

/** Loads the written text as its own chunk, so the first bundle does not carry the 26 posts. */
export function loadWrittenText(): Promise<ContentMap> {
  return import('./en.ts').then((module) => module.content)
}

/**
 * Wraps a base query so the written text replaces the title and the body of
 * the posts the API sends, matched by id. Everything else stays as the API sent it.
 * The chunk starts loading with the request, so neither waits for the other.
 */
export function withWrittenText<Args, Result, Error, Definition = object, Meta = object>(
  baseQuery: BaseQueryFn<Args, Result, Error, Definition, Meta>,
  load: () => Promise<ContentMap> = loadWrittenText,
): BaseQueryFn<Args, Result, Error, Definition, Meta> {
  return async (args, api, extraOptions) => {
    // A chunk that fails is not an error: the post keeps the text of the API.
    const written = load().catch(() => null)
    const result = await baseQuery(args, api, extraOptions)
    if (result.error || !Array.isArray(result.data)) return result
    const map = await written
    if (!map) return result
    const data = result.data.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) return item
      const id = (item as { id?: unknown }).id
      if (typeof id !== 'string' || !Object.hasOwn(map, id)) return item
      return { ...item, title: map[id].title, content: map[id].content }
    })
    return { ...result, data: data as Result } as typeof result
  }
}
