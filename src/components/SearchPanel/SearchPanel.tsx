import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { searchChanged } from '../../features/browse/browseSlice'
import { selectVisiblePosts } from '../../features/posts/selectors'
import { Icon } from '../Icon/Icon'
import styles from './SearchPanel.module.css'

interface SearchPanelProps {
  /** Closes the panel. The page gives the focus back to the button that opened it. */
  onClose: () => void
}

/**
 * The mobile search, a dialog over the list. It edits the same search as the
 * desktop field, so the list under it follows, and it lists the titles that
 * match, each one a link to its post. With nothing typed it lists nothing:
 * every post would match, and the list under the panel already shows them.
 */
export function SearchPanel({ onClose }: SearchPanelProps) {
  const search = useAppSelector((state) => state.browse.search)
  const posts = useAppSelector(selectVisiblePosts)
  const dispatch = useAppDispatch()
  const field = useRef<HTMLInputElement>(null)

  const typed = search.trim() !== ''
  const results = typed ? posts : []

  // The panel opens with the focus in the field.
  useEffect(() => {
    field.current?.focus()
  }, [])

  // Esc closes the panel. The default is cancelled because a search input
  // would also clear the text on Esc.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    onClose()
  }

  const clear = () => {
    dispatch(searchChanged(''))
    field.current?.focus()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className={styles.panel}
      onKeyDown={onKeyDown}
    >
      <div className={styles.bar}>
        <button
          type="button"
          className={`${styles.icon} ${styles.back}`}
          aria-label="Close search"
          onClick={onClose}
        >
          <Icon name="back" size={16} />
        </button>
        <input
          ref={field}
          type="search"
          className={styles.input}
          aria-label="Search"
          value={search}
          onChange={(event) => dispatch(searchChanged(event.target.value))}
        />
        <button
          type="button"
          className={`${styles.icon} ${styles.clear}`}
          aria-label="Clear search"
          onClick={clear}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <ul className={styles.results}>
        {results.map((post) => (
          <li key={post.id}>
            <Link to={`/posts/${encodeURIComponent(post.id)}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
      <p role="status" className={styles.empty}>
        {typed && results.length === 0 ? 'No posts found' : ''}
      </p>
    </div>
  )
}
