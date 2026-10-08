import { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { Button } from '../components/Button/Button'
import { PostCard } from '../components/PostCard/PostCard'
import { PostLayout } from '../components/PostLayout/PostLayout'
import { StatusMessage } from '../components/StatusMessage/StatusMessage'
import { authorPosts } from '../features/posts/authorPosts'
import { usePosts } from '../features/posts/usePosts'
import { useT } from '../i18n/useT'
import { NotFoundPage } from './NotFoundPage'
import styles from './AuthorPage.module.css'

/**
 * The posts of one author, from the same localized list as the other pages.
 * An author exists only through the posts of the API, so an id with no post
 * is an unknown address, not an empty page.
 */
export function AuthorPage() {
  const { id = '' } = useParams()
  const { posts, isError, refetch } = usePosts()
  const { t } = useT()
  const heading = useRef<HTMLHeadingElement>(null)
  const written = posts === undefined ? [] : authorPosts(posts, id)
  const found = written.length > 0

  // The name takes the focus once it exists: loaded directly, the posts only
  // come after the first render.
  useEffect(() => {
    if (found) heading.current?.focus({ preventScroll: true })
  }, [id, found])

  if (posts === undefined && isError) {
    return (
      <PostLayout>
        <StatusMessage role="alert" message={t('status.error')}>
          <Button onClick={() => refetch()}>{t('status.retry')}</Button>
        </StatusMessage>
      </PostLayout>
    )
  }
  if (posts === undefined) {
    return (
      <PostLayout>
        <StatusMessage message={t('list.loading')} />
      </PostLayout>
    )
  }
  if (!found) return <NotFoundPage />

  const { name } = written[0].author

  return (
    <main className={styles.main}>
      <title>{`${name} | DWS Blog`}</title>
      <div className={styles.head}>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>
          {name}
        </h1>
        <p className={styles.count}>{t('list.count', { count: written.length })}</p>
      </div>
      <ul className={styles.grid}>
        {written.map((post) => (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </main>
  )
}
