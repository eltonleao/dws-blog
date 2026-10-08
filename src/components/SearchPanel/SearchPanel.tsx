import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { useAppSelector } from '../../app/hooks'
import { useSearch } from '../../features/browse/useSearch'
import { selectVisiblePosts } from '../../features/posts/selectors'
import type { Post } from '../../features/posts/types'
import { usePosts } from '../../features/posts/usePosts'
import { useT } from '../../i18n/useT'
import { Icon } from '../Icon/Icon'
import styles from './SearchPanel.module.css'

// Nothing to search until the posts come.
const NO_POSTS: Post[] = []

interface SearchPanelProps {
  /** Closes the panel. The layout gives the focus back to the button that opened it. */
  onClose: () => void
}

/**
 * The mobile search, a dialog over the page. It edits the same search as the
 * desktop field, so the list under it follows (on any other page, the first
 * key brings the list), and it lists the titles that match, each one a link
 * to its post. With nothing typed it lists nothing: every post would match,
 * and the list under the panel already shows them.
 */
export function SearchPanel({ onClose }: SearchPanelProps) {
  const [search, changeSearch] = useSearch()
  const { t } = useT()
  // The titles the reader sees, in the language of the page.
  const { posts: all } = usePosts()
  const posts = useAppSelector((state) => selectVisiblePosts(state, all ?? NO_POSTS))
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
    changeSearch('')
    field.current?.focus()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('search.label')}
      className={styles.panel}
      onKeyDown={onKeyDown}
    >
      <div className={styles.bar}>
        <button
          type="button"
          className={`${styles.icon} ${styles.back}`}
          aria-label={t('search.close')}
          onClick={onClose}
        >
          <Icon name="back" size={16} />
        </button>
        <input
          ref={field}
          type="search"
          className={styles.input}
          aria-label={t('search.label')}
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
        />
        <button
          type="button"
          className={`${styles.icon} ${styles.clear}`}
          aria-label={t('search.clear')}
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
        {typed && results.length === 0 ? t('list.empty') : ''}
      </p>
    </div>
  )
}
