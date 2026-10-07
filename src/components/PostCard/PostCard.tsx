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
          <span aria-hidden="true">•</span>
          <span>{post.author.name}</span>
        </p>
        <div className={styles.text}>
          <h2>
            <Link to={`/posts/${encodeURIComponent(post.id)}`}>{post.title}</Link>
          </h2>
          {summary ? <p>{summary}</p> : null}
        </div>
        {post.categories.length > 0 ? (
          <ul className={styles.categories}>
            {post.categories.map((category) => (
              <li key={category.id || category.name}>{category.name}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  )
}
