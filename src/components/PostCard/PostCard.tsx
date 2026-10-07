import { useState } from 'react'
import { Link } from 'react-router'
import type { Post } from '../../features/posts/types'
import { formatDate } from '../../lib/formatDate'
import { toParagraphs } from '../../lib/paragraphs'
import styles from './PostCard.module.css'

interface PostCardProps {
  post: Post
}

/**
 * One post of a grid. It takes the post and nothing else, so the React
 * Compiler keeps the card while the post is the same object. The title is the
 * one link of the card, and every text from the API is rendered as text.
 */
export function PostCard({ post }: PostCardProps) {
  // A thumbnail that fails to load gives its place to a block of the same size.
  const [broken, setBroken] = useState(false)
  // The summary is the start of the content; the CSS cuts it to the lines that fit.
  const summary = toParagraphs(post.content)[0]

  return (
    <article className={styles.card}>
      {broken || post.thumbnailUrl === '' ? (
        <div className={styles.placeholder} />
      ) : (
        <img
          className={styles.image}
          src={post.thumbnailUrl}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      <div className={styles.body}>
        <p className={styles.meta}>
          <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
          <span className={styles.dot} aria-hidden="true" />
          <span>{post.author.name}</span>
        </p>
        {/* Title and summary share four lines, cut as one block: three of
            summary under a title of one line, two under a title of two. */}
        <div className={styles.text}>
          <h2 className={styles.title}>
            {/* The link stretches over the whole card, which has no other
                focusable thing, so a click anywhere on it opens the post. */}
            <Link className={styles.link} to={`/posts/${encodeURIComponent(post.id)}`}>
              {post.title}
            </Link>
          </h2>
          {summary ? <p className={styles.summary}>{summary}</p> : null}
        </div>
        {post.categories.length > 0 ? (
          <ul className={styles.categories}>
            {post.categories.map((category) => (
              <li key={category.id || category.name} className={styles.tag}>
                {category.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  )
}
