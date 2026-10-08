import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../components/Button/Button'
import { Icon } from '../components/Icon/Icon'
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

/** From this many characters on, the counter warns that the end is near. */
const NEAR_LIMIT = COMMENT_MAX_LENGTH - 50

/** "Commenting as {name}", with the name in bold wherever the language puts it. */
function VisitorLine({ sentence, name }: { sentence: string; name: string }) {
  const parts = sentence.split(name)
  if (parts.length !== 2) return <>{sentence}</>
  return (
    <>
      {parts[0]}
      <strong className={styles.visitorName}>{name}</strong>
      {parts[1]}
    </>
  )
}

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
  const heading = useRef<HTMLHeadingElement>(null)
  // A second click lands before the button re-renders disabled.
  const sending = useRef(false)

  async function send(event: FormEvent) {
    event.preventDefault()
    if (draft.trim() === '') field.current?.focus()
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

  // The comment, and its button, leave at once: the focus goes to the title,
  // which now says how many are left, and not to the end of the page.
  async function remove(id: string) {
    setProblem(undefined)
    heading.current?.focus({ preventScroll: true })
    const result = await deleteComment(id)
    if (result.error) setProblem('comments.deleteFailed')
  }

  // Leave goes with the visitor; the focus stays in the form.
  async function leave() {
    await leaveVisitor()
    field.current?.focus({ preventScroll: true })
  }

  const list = comments.data
  const unavailable = list === undefined && comments.isError
  const unconfigured = isCommentsError(comments.error) && comments.error.reason === 'unconfigured'

  return (
    <section className={styles.section} aria-labelledby="comments-title">
      <h2 id="comments-title" ref={heading} tabIndex={-1} className={styles.title}>
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
            <div className={styles.fieldHead}>
              <label htmlFor="comment-body" className={styles.label}>
                {t('comments.label')}
              </label>
              <span
                id="comment-counter"
                className={styles.counter}
                data-near-limit={draft.length >= NEAR_LIMIT || undefined}
              >
                {`${draft.length}/${COMMENT_MAX_LENGTH}`}
              </span>
            </div>
            <textarea
              id="comment-body"
              ref={field}
              className={styles.field}
              value={draft}
              maxLength={COMMENT_MAX_LENGTH}
              rows={4}
              aria-describedby="comment-counter"
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className={styles.actions}>
              {visitor ? (
                <p className={styles.visitor}>
                  <span>
                    <VisitorLine
                      sentence={t('comments.visitor', { name: visitor.displayName })}
                      name={visitor.displayName}
                    />
                  </span>
                  <button
                    type="button"
                    className={styles.leave}
                    disabled={leaving.isLoading}
                    onClick={leave}
                  >
                    {t('comments.leave')}
                  </button>
                </p>
              ) : null}
              <Button type="submit" className={styles.submit} disabled={adding.isLoading}>
                {t('comments.submit')}
              </Button>
            </div>
            {problem ? (
              <p role="alert" className={styles.problem}>
                {t(problem)}
              </p>
            ) : null}
          </form>

          {list === undefined || list.length === 0 ? (
            <StatusMessage message={t(list === undefined ? 'comments.loading' : 'comments.empty')} />
          ) : (
            <ol className={styles.list}>
              {list.map((comment) => (
                <li key={comment.id} className={styles.comment}>
                  <div className={styles.commentHead}>
                    <p className={styles.meta}>
                      <span className={styles.author}>{comment.displayName}</span>
                      <span className={styles.dot} aria-hidden="true" />
                      <time dateTime={comment.createdAt}>{formatDate(comment.createdAt, locale)}</time>
                    </p>
                    {visitor && comment.userId === visitor.userId ? (
                      <button
                        type="button"
                        className={styles.delete}
                        aria-label={t('comments.delete')}
                        onClick={() => remove(comment.id)}
                      >
                        <Icon name="trash" size={20} />
                      </button>
                    ) : null}
                  </div>
                  <p className={styles.body}>{comment.body}</p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
