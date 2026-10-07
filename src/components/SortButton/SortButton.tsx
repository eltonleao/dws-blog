import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { orderToggled } from '../../features/browse/browseSlice'
import type { SortOrder } from '../../features/posts/types'
import styles from './SortButton.module.css'

const LABELS: Record<SortOrder, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
}

/**
 * One button that names the current order and flips it. It is not a toggle,
 * so there is no aria-pressed: the label already says the state, and the
 * change is announced in a polite live region.
 */
export function SortButton() {
  const order = useAppSelector((state) => state.browse.order)
  const dispatch = useAppDispatch()
  // Empty until the reader sorts: the region speaks after a click, never on load.
  const [announcement, setAnnouncement] = useState('')

  const toggle = () => {
    const next: SortOrder = order === 'newest' ? 'oldest' : 'newest'
    dispatch(orderToggled())
    setAnnouncement(`Sorted by ${LABELS[next].toLowerCase()}`)
  }

  return (
    <div className={styles.sort}>
      <span className={styles.label}>Sort by:</span>
      <button type="button" onClick={toggle}>
        {LABELS[order]}
      </button>
      <span className={styles.announcement} aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
