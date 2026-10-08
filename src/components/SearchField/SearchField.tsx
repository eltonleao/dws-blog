import { useSearch } from '../../features/browse/useSearch'
import { useT } from '../../i18n/useT'
import { Icon } from '../Icon/Icon'
import styles from './SearchField.module.css'

/**
 * The desktop search: every key typed filters the list at once, and on any
 * other page the first one takes the reader to the list. There is nothing to
 * submit, so Enter is cancelled before the browser reloads the page.
 */
export function SearchField() {
  const [search, changeSearch] = useSearch()
  const { t } = useT()

  return (
    <form
      role="search"
      className={styles.form}
      onSubmit={(event) => event.preventDefault()}
    >
      <input
        type="search"
        className={styles.input}
        aria-label={t('search.label')}
        placeholder={t('search.label')}
        value={search}
        onChange={(event) => changeSearch(event.target.value)}
      />
      <span className={styles.icon} aria-hidden="true">
        <Icon name="search" />
      </span>
    </form>
  )
}
