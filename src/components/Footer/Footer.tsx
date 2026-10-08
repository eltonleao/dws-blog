import { useLocation, useNavigate } from 'react-router'
import { useT } from '../../i18n/useT'
import { Icon } from '../Icon/Icon'
import styles from './Footer.module.css'

/**
 * The foot of the bug hunt, the one page that has one: the way back to the
 * blog, so /proof opened by its address is never a dead end. The blog itself
 * has no footer; the hunt is reached by its address and from the README.
 */
export function Footer() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useT()

  if (location.pathname !== '/proof') return null

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
      <button type="button" className={styles.action} onClick={goBack}>
        <Icon name="back" size={20} className={styles.icon} />
        <span className={styles.call}>{t('footer.back')}</span>
      </button>
    </footer>
  )
}
