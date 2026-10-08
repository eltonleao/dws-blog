import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Button } from '../components/Button/Button'
import { PostCard } from '../components/PostCard/PostCard'
import { PostLayout } from '../components/PostLayout/PostLayout'
import { StatusMessage } from '../components/StatusMessage/StatusMessage'
import { latestPosts } from '../features/posts/latestPosts'
import { usePosts } from '../features/posts/usePosts'
import { useT } from '../i18n/useT'
import { formatDate } from '../lib/formatDate'
import { toParagraphs } from '../lib/paragraphs'
import { NotFoundPage } from './NotFoundPage'
import styles from './PostPage.module.css'

/**
 * One post, read from the same localized list as the list page: coming from
 * the list it makes no request, and an id the list does not have is a post not
 * found, not a server error. The page opens at the top, with the focus on its
 * title, and Latest articles closes it with three other posts.
 */
export function PostPage() {
  const { id = '' } = useParams()
  const { posts, isError, refetch } = usePosts()
  const post = posts?.find((candidate) => candidate.id === id)
  const { t, locale } = useT()
  const heading = useRef<HTMLHeadingElement>(null)
  const found = post !== undefined
  // A picture that fails to load gives its place to a block of the same size.
  // Each holds the address that failed, so the next post starts with its own.
  const [brokenImage, setBrokenImage] = useState('')
  const [brokenAvatar, setBrokenAvatar] = useState('')

  // Every post opens at the top, also when Latest articles opens the next one
  // on the same page. The layout effect scrolls before the browser paints.
  useLayoutEffect(() => {
    if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [id])

  // The title takes the focus once it exists: loaded directly, the post only
  // comes with the list, after the first render.
  useEffect(() => {
    if (found) heading.current?.focus({ preventScroll: true })
  }, [id, found])

  // A failed first load is an error; a retry after it loads like the first time.
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
        <StatusMessage message={t('post.loading')} />
      </PostLayout>
    )
  }
  if (post === undefined) return <NotFoundPage />

  const latest = latestPosts(posts, post.id)
  const image = post.thumbnailUrl
  const avatar = post.author.profilePicture

  return (
    <PostLayout>
      <title>{`${post.title} | DWS Blog`}</title>
      <article className={styles.article}>
        <div className={styles.head}>
          <h1 ref={heading} tabIndex={-1} className={styles.title}>
            {post.title}
          </h1>
          <div className={styles.byline}>
            {avatar === '' || avatar === brokenAvatar ? (
              <div className={styles.avatar} />
            ) : (
              <img
                className={styles.avatar}
                src={avatar}
                alt=""
                onError={() => setBrokenAvatar(avatar)}
              />
            )}
            <div className={styles.bylineText}>
              <p>
                {t('post.writtenBy')} <strong className={styles.author}>{post.author.name}</strong>
              </p>
              <time className={styles.date} dateTime={post.createdAt}>
                {formatDate(post.createdAt, locale)}
              </time>
            </div>
          </div>
        </div>
        {image === '' || image === brokenImage ? (
          <div className={styles.image} />
        ) : (
          <img
            className={styles.image}
            src={image}
            alt=""
            onError={() => setBrokenImage(image)}
          />
        )}
        <div className={styles.body}>
          {toParagraphs(post.content).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>
      {latest.length > 0 ? (
        <section className={styles.latest} aria-labelledby="latest-articles">
          <h2 id="latest-articles" className={styles.latestTitle}>
            {t('post.latest')}
          </h2>
          <ul className={styles.grid}>
            {latest.map((other) => (
              <li key={other.id}>
                <PostCard post={other} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PostLayout>
  )
}
