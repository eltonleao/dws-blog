import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { searchChanged } from '../../features/browse/browseSlice'
import styles from './SearchField.module.css'

/**
 * The desktop search: every key typed filters the list at once. There is
 * nothing to submit, so Enter is cancelled before the browser reloads the page.
 */
export function SearchField() {
  const search = useAppSelector((state) => state.browse.search)
  const dispatch = useAppDispatch()

  return (
    <form
      role="search"
      className={styles.form}
      onSubmit={(event) => event.preventDefault()}
    >
      <input
        type="search"
        className={styles.input}
        aria-label="Search"
        placeholder="Search"
        value={search}
        onChange={(event) => dispatch(searchChanged(event.target.value))}
      />
      <span className={styles.icon} aria-hidden="true">
        ⌕
      </span>
    </form>
  )
}
