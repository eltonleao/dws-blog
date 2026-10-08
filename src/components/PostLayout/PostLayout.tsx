import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { useT } from '../../i18n/useT'
import styles from './PostLayout.module.css'

interface PostLayoutProps {
  /** What the page shows in the content column: the post, or the state that takes its place. */
  children: ReactNode
}

/**
 * The frame of the post page and of the pages that stand in for a post, under
 * the header of the layout: Back over the content on mobile; on desktop, Back
 * in the first two columns of the grid and the content in columns 3 to 10.
 */
export function PostLayout({ children }: PostLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useT()

  const goBack = () => {
    // A page opened directly has nothing of the app behind it, so Back goes
    // to the list instead of leaving the site.
    if (location.key === 'default') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.back}>
        <Button variant="secondary" onClick={goBack}>
          <Icon name="back" />
          {t('post.back')}
        </Button>
      </div>
      <div className={styles.content}>{children}</div>
    </main>
  )
}
