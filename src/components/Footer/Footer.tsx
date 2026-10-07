import { Link, useLocation, useNavigate } from 'react-router'
import proofCount from '../../proof/proof-count.json'
import { Icon } from '../Icon/Icon'
import styles from './Footer.module.css'

/**
 * The foot of every page, the one element the design does not draw: a link to
 * the bug hunt, and on the bug hunt the way back to the blog. The count comes
 * from proof-count.json, so the data of the hunt stays out of the main chunk.
 */
export function Footer() {
  const location = useLocation()
  const navigate = useNavigate()

  const goBack = () => {
    // The bug hunt opened directly has nothing of the blog behind it, so the
    // way back goes to the list instead of leaving the site.
    if (location.key === 'default') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  return (
    <footer className={styles.footer}>
      {location.pathname === '/proof' ? (
        <button type="button" className={styles.action} onClick={goBack}>
          <Icon name="back" size={20} className={styles.icon} />
          <span className={styles.call}>Back to the blog</span>
        </button>
      ) : (
        <Link to="/proof" className={styles.action}>
          <Icon name="bug" size={20} className={styles.icon} />
          <span className={styles.label}>
            <span className={styles.lead}>How this blog was tested:</span>{' '}
            <span className={styles.call}>
              hunt the {proofCount.total} planted bugs
            </span>
          </span>
        </Link>
      )}
    </footer>
  )
}
