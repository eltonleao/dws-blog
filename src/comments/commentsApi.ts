import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Visitor } from './visitor'

// The comments of each post, in the Supabase project. Every request first
// loads the client with a dynamic import, so this file, which the store holds
// from the start, never pulls the package into the main chunk.

/** The most comments a post shows, newest first. */
export const COMMENTS_LIMIT = 100

/** The longest comment the table accepts, counted after trimming. */
export const COMMENT_MAX_LENGTH = 500

export interface Comment {
  id: string
  postId: string
  /** The anonymous user who wrote it: the current visitor may delete their own. */
  userId: string
  displayName: string
  body: string
  createdAt: string
}

export interface CommentsError {
  /**
   * unconfigured: the build has no project, and nothing was requested;
   * visitor: the anonymous sign-in failed (turned off, or no answer);
   * invalid: the comment is empty or too long, and was not sent;
   * request: the database refused the request or did not answer.
   */
  reason: 'unconfigured' | 'visitor' | 'invalid' | 'request'
  message: string
  /** HTTP status of the answer; 0 when there was none. */
  status?: number
  /** PostgREST or Auth code, such as 42501 for a refusal by the policy. */
  code?: string
}

interface CommentRow {
  id: string
  post_id: string
  user_id: string
  display_name: string
  body: string
  created_at: string
}

const COLUMNS = 'id, post_id, user_id, display_name, body, created_at'

const UNCONFIGURED: CommentsError = {
  reason: 'unconfigured',
  message: 'The comments project is not configured',
}

const toComment = (row: CommentRow): Comment => ({
  id: row.id,
  postId: row.post_id,
  userId: row.user_id,
  displayName: row.display_name,
  body: row.body,
  createdAt: row.created_at,
})

function failure(reason: CommentsError['reason'], error: unknown, status = 0): CommentsError {
  const { message, code } = (typeof error === 'object' && error !== null ? error : {}) as {
    message?: unknown
    code?: unknown
  }
  return {
    reason,
    message: typeof message === 'string' && message !== '' ? message : String(error),
    status,
    ...(code === undefined || code === null || code === '' ? {} : { code: String(code) }),
  }
}

function statusOf(error: unknown): number {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : 0
}

async function loadSupabase() {
  const { getSupabase } = await import('./supabaseClient')
  return getSupabase()
}

type Outcome<T> = { data: T } | { error: CommentsError }

// A package that does not load or a request that throws ends as an error to
// show, never as an exception out of the query.
async function settle<T>(run: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
  try {
    return await run()
  } catch (error) {
    return { error: failure('request', error) }
  }
}

export const commentsApi = createApi({
  reducerPath: 'commentsApi',
  baseQuery: fakeBaseQuery<CommentsError>(),
  tagTypes: ['Comments', 'Visitor'],
  endpoints: (build) => ({
    /** The newest comments of a post, at most COMMENTS_LIMIT. */
    getComments: build.query<Comment[], string>({
      queryFn: (postId) =>
        settle<Comment[]>(async () => {
          const supabase = await loadSupabase()
          if (!supabase) return { error: UNCONFIGURED }
          const { data, error, status } = await supabase
            .from('comments')
            .select(COLUMNS)
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .limit(COMMENTS_LIMIT)
            .overrideTypes<CommentRow[], { merge: false }>()
          if (error) return { error: failure('request', error, status) }
          return { data: data.map(toComment) }
        }),
      providesTags: (_result, _error, postId) => [{ type: 'Comments', id: postId }],
    }),

    /** The visitor of the session kept in the browser, or `null`. */
    getVisitor: build.query<Visitor | null, void>({
      queryFn: () =>
        settle<Visitor | null>(async () => {
          const { currentVisitor } = await import('./visitor')
          return { data: await currentVisitor() }
        }),
      providesTags: ['Visitor'],
    }),

    /**
     * Sends a comment as the visitor, who is born here on the first one. The
     * text goes trimmed, the way the table counts it. On success the comment
     * joins the list of its post; on failure the list is left as it was.
     */
    addComment: build.mutation<Comment, { postId: string; body: string }>({
      queryFn: ({ postId, body }) =>
        settle<Comment>(async () => {
          const text = body.trim()
          if (text === '' || text.length > COMMENT_MAX_LENGTH) {
            return { error: { reason: 'invalid', message: 'The comment is empty or too long' } }
          }
          const supabase = await loadSupabase()
          if (!supabase) return { error: UNCONFIGURED }
          const { ensureVisitor } = await import('./visitor')
          let visitor: Visitor
          try {
            visitor = await ensureVisitor()
          } catch (error) {
            return { error: failure('visitor', error, statusOf(error)) }
          }
          const { data, error, status } = await supabase
            .from('comments')
            .insert({ post_id: postId, display_name: visitor.displayName, body: text })
            .select(COLUMNS)
            .single()
            .overrideTypes<CommentRow, { merge: false }>()
          if (error) return { error: failure('request', error, status) }
          return { data: toComment(data) }
        }),
      // The first comment may have created the visitor, even when the insert failed.
      invalidatesTags: ['Visitor'],
      onQueryStarted: async ({ postId }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          dispatch(
            commentsApi.util.updateQueryData('getComments', postId, (draft) => {
              if (!draft.some((comment) => comment.id === data.id)) draft.unshift(data)
            }),
          )
        } catch {
          // The caller reads the error from the result of the mutation.
        }
      },
    }),

    /**
     * Deletes a comment of the visitor. It leaves every cached list at once
     * and comes back if the database does not delete it.
     */
    deleteComment: build.mutation<void, string>({
      queryFn: (id) =>
        settle<void>(async () => {
          const supabase = await loadSupabase()
          if (!supabase) return { error: UNCONFIGURED }
          const { error, status } = await supabase.from('comments').delete().eq('id', id)
          if (error) return { error: failure('request', error, status) }
          return { data: undefined }
        }),
      onQueryStarted: async (id, { dispatch, getState, queryFulfilled }) => {
        const patches = commentsApi.util
          .selectCachedArgsForQuery(getState(), 'getComments')
          .map((postId) =>
            dispatch(
              commentsApi.util.updateQueryData('getComments', postId, (draft) => {
                const index = draft.findIndex((comment) => comment.id === id)
                if (index !== -1) draft.splice(index, 1)
              }),
            ),
          )
        try {
          await queryFulfilled
        } catch {
          for (const patch of patches) patch.undo()
        }
      },
    }),

    /** Ends the session of the visitor; their comments stay. */
    leaveVisitor: build.mutation<void, void>({
      queryFn: () =>
        settle<void>(async () => {
          const { leaveVisitor } = await import('./visitor')
          await leaveVisitor()
          return { data: undefined }
        }),
      invalidatesTags: ['Visitor'],
    }),
  }),
})

export const {
  useGetCommentsQuery,
  useGetVisitorQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useLeaveVisitorMutation,
} = commentsApi
