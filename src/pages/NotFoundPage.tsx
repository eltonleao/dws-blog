import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { PostLayout } from '../components/PostLayout/PostLayout'
import styles from './NotFoundPage.module.css'

/**
 * What an id the list does not have and an unknown address both show: the
 * post is not there, Back, and a link to the list. It is not the error of a
 * failed request, so it offers no retry.
 */
export function NotFoundPage() {
  const heading = useRef<HTMLHeadingElement>(null)

  // Like a post, the page takes the focus to its title when it opens.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  return (
    <PostLayout>
      <title>Post not found | DWS Blog</title>
      <h1 ref={heading} tabIndex={-1} className={styles.title}>
        Post not found
      </h1>
      <p className={styles.text}>
        There is no post at this address. It may have been removed, or the link
        may be wrong. <Link to="/" className={styles.link}>See all posts</Link>
      </p>
    </PostLayout>
  )
}
