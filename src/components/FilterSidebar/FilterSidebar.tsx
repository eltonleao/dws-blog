import { useId, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { filtersApplied } from '../../features/browse/browseSlice'
import type { FilterOption, FilterSelection } from '../../features/posts/types'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import styles from './FilterSidebar.module.css'

type Filter = keyof FilterSelection

const GROUPS: { filter: Filter; label: string }[] = [
  { filter: 'categories', label: 'Category' },
  { filter: 'authors', label: 'Author' },
]

interface FilterSidebarProps {
  /** Every category and author, as `filterOptions` gives them. */
  options: Record<Filter, FilterOption[]>
}

/** A choice not applied yet, with the applied lists it started from. */
interface Draft {
  from: FilterSelection
  selection: FilterSelection
}

/**
 * The desktop filters. Marking an item only changes a draft the sidebar keeps
 * to itself, and Apply filters sends it to the browse state in one go. The
 * items are toggle buttons, because their label never changes.
 */
export function FilterSidebar({ options }: FilterSidebarProps) {
  const categories = useAppSelector((state) => state.browse.categories)
  const authors = useAppSelector((state) => state.browse.authors)
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState<Draft | null>(null)
  const headingId = useId()

  // When the applied filters change under the draft (Clear filters, or the
  // mobile dropdowns before a resize), the draft is stale, and the sidebar
  // shows what is applied again.
  const selection: FilterSelection =
    draft !== null &&
    draft.from.categories === categories &&
    draft.from.authors === authors
      ? draft.selection
      : { categories, authors }

  const toggle = (filter: Filter, value: string) => {
    const values = selection[filter]
    setDraft({
      from: { categories, authors },
      selection: {
        ...selection,
        [filter]: values.includes(value)
          ? values.filter((current) => current !== value)
          : [...values, value],
      },
    })
  }

  const apply = () => {
    dispatch(filtersApplied(selection))
    setDraft(null)
  }

  return (
    <section className={styles.sidebar} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        <Icon name="filters" />
        Filters
      </h2>
      {GROUPS.map(({ filter, label }) => (
        <div key={filter} className={styles.group}>
          <h3 className={styles.groupHeading}>{label}</h3>
          <ul className={styles.items}>
            {options[filter].map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={styles.item}
                  aria-pressed={selection[filter].includes(option.value)}
                  onClick={() => toggle(filter, option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Button className={styles.apply} onClick={apply}>
        Apply filters
      </Button>
    </section>
  )
}
