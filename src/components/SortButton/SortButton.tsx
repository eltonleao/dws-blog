import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { orderToggled } from '../../features/browse/browseSlice'
import type { SortOrder } from '../../features/posts/types'
import { useT } from '../../i18n/useT'
import { Icon } from '../Icon/Icon'
import styles from './SortButton.module.css'

const LABELS = {
  newest: 'sort.newest',
  oldest: 'sort.oldest',
} as const satisfies Record<SortOrder, string>

const SORTED = {
  newest: 'sort.sortedNewest',
  oldest: 'sort.sortedOldest',
} as const satisfies Record<SortOrder, string>

/**
 * One button that names the current order and flips it. It is not a toggle,
 * so there is no aria-pressed: the label already says the state, and the
 * change is announced in a polite live region.
 */
export function SortButton() {
  const order = useAppSelector((state) => state.browse.order)
  const dispatch = useAppDispatch()
  const { t } = useT()
  // Empty until the reader sorts: the region speaks after a click, never on load.
  const [announcement, setAnnouncement] = useState('')

  const toggle = () => {
    const next: SortOrder = order === 'newest' ? 'oldest' : 'newest'
    dispatch(orderToggled())
    setAnnouncement(t(SORTED[next]))
  }

  return (
    <div className={styles.sort}>
      <span className={styles.label}>{t('sort.label')}</span>
      <button type="button" className={styles.button} onClick={toggle}>
        {t(LABELS[order])}
        <Icon name="sort" className={styles.icon} />
      </button>
      <span className={styles.announcement} aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
