import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../components/Button/Button'
import { StatusMessage } from '../components/StatusMessage/StatusMessage'
import { useT } from '../i18n/useT'
import type { MessageKey } from '../i18n/messages/en'
import { formatDate } from '../lib/formatDate'
import {
  COMMENT_MAX_LENGTH,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useGetVisitorQuery,
  useLeaveVisitorMutation,
} from './commentsApi'
import type { CommentsError } from './commentsApi'
import styles from './CommentsSection.module.css'

interface CommentsSectionProps {
  postId: string
}

const isCommentsError = (error: unknown): error is CommentsError =>
  typeof error === 'object' && error !== null && 'reason' in error

/**
 * The comments at the end of a post: the form, the visitor who writes, and the
 * comments of the post, newest first. The post page gives it `key={post.id}`,
 * so a draft never travels to another post.
 */
export function CommentsSection({ postId }: CommentsSectionProps) {
  const { t, locale } = useT()
  const comments = useGetCommentsQuery(postId)
  const { data: visitor } = useGetVisitorQuery()
  const [addComment, adding] = useAddCommentMutation()
  const [deleteComment] = useDeleteCommentMutation()
  const [leaveVisitor, leaving] = useLeaveVisitorMutation()
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<MessageKey>()
  const field = useRef<HTMLTextAreaElement>(null)
  // A second click lands before the button re-renders disabled.
  const sending = useRef(false)

  async function send(event: FormEvent) {
    event.preventDefault()
    if (sending.current || draft.trim() === '') return
    sending.current = true
    setProblem(undefined)
    const result = await addComment({ postId, body: draft })
    sending.current = false
    if (result.error) {
      const reason = isCommentsError(result.error) ? result.error.reason : 'request'
      setProblem(reason === 'visitor' ? 'comments.visitorFailed' : 'comments.sendFailed')
      return
    }
    setDraft('')
    field.current?.focus()
  }

  async function remove(id: string) {
    setProblem(undefined)
    const result = await deleteComment(id)
    if (result.error) setProblem('comments.deleteFailed')
  }

  const list = comments.data
  const unavailable = list === undefined && comments.isError
  const unconfigured = isCommentsError(comments.error) && comments.error.reason === 'unconfigured'

  return (
    <section className={styles.section} aria-labelledby="comments-title">
      <h2 id="comments-title" className={styles.title}>
        {list === undefined ? t('comments.heading') : t('comments.title', { count: list.length })}
      </h2>

      {unavailable ? (
        <StatusMessage role="alert" message={t('comments.unavailable')}>
          {unconfigured ? null : (
            <Button onClick={() => comments.refetch()}>{t('status.retry')}</Button>
          )}
        </StatusMessage>
      ) : (
        <>
          <form className={styles.form} onSubmit={send}>
            <label htmlFor="comment-body" className={styles.label}>
              {t('comments.label')}
            </label>
            <textarea
              id="comment-body"
              ref={field}
              className={styles.field}
              value={draft}
              maxLength={COMMENT_MAX_LENGTH}
              rows={3}
              aria-describedby="comment-counter"
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className={styles.formFooter}>
              <span id="comment-counter" className={styles.counter}>
                {`${draft.length}/${COMMENT_MAX_LENGTH}`}
              </span>
              <Button type="submit" disabled={adding.isLoading}>
                {t('comments.submit')}
              </Button>
            </div>
            {problem ? (
              <p role="alert" className={styles.problem}>
                {t(problem)}
              </p>
            ) : null}
          </form>

          {visitor ? (
            <div className={styles.visitor}>
              <p>{t('comments.visitor', { name: visitor.displayName })}</p>
              <Button variant="secondary" disabled={leaving.isLoading} onClick={() => leaveVisitor()}>
                {t('comments.leave')}
              </Button>
            </div>
          ) : null}

          {list === undefined ? (
            <StatusMessage message={t('comments.loading')} />
          ) : list.length === 0 ? (
            <StatusMessage message={t('comments.empty')} />
          ) : (
            <ol className={styles.list}>
              {list.map((comment) => (
                <li key={comment.id} className={styles.comment}>
                  <p className={styles.meta}>
                    <span className={styles.author}>{comment.displayName}</span>{' '}
                    <time dateTime={comment.createdAt}>{formatDate(comment.createdAt, locale)}</time>
                  </p>
                  <p className={styles.body}>{comment.body}</p>
                  {visitor && comment.userId === visitor.userId ? (
                    <Button variant="secondary" onClick={() => remove(comment.id)}>
                      {t('comments.delete')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
