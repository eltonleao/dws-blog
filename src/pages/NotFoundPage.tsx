import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { PostLayout } from '../components/PostLayout/PostLayout'
import { useT } from '../i18n/useT'
import styles from './NotFoundPage.module.css'

/**
 * What an id the list does not have and an unknown address both show: the
 * post is not there, Back, and a link to the list. It is not the error of a
 * failed request, so it offers no retry.
 */
export function NotFoundPage() {
  const heading = useRef<HTMLHeadingElement>(null)
  const { t } = useT()

  // Like a post, the page takes the focus to its title when it opens.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  return (
    <PostLayout>
      <title>{`${t('notFound.title')} | DWS Blog`}</title>
      <h1 ref={heading} tabIndex={-1} className={styles.title}>
        {t('notFound.title')}
      </h1>
      <p className={styles.text}>
        {t('notFound.text')}{' '}
        <Link to="/" className={styles.link}>
          {t('notFound.seeAll')}
        </Link>
      </p>
    </PostLayout>
  )
}
