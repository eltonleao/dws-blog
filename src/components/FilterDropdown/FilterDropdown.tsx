import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import {
  authorToggled,
  categoryToggled,
  filtersApplied,
} from '../../features/browse/browseSlice'
import type { FilterOption, FilterSelection } from '../../features/posts/types'
import { categoryLabel } from '../../i18n/categories'
import { useT } from '../../i18n/useT'
import { Icon } from '../Icon/Icon'
import styles from './FilterDropdown.module.css'

type Filter = keyof FilterSelection

const LABELS = {
  categories: 'filters.category',
  authors: 'filters.author',
} as const

const CLEAR_LABELS = {
  categories: 'filters.clearCategory',
  authors: 'filters.clearAuthor',
} as const

const TOGGLES = { categories: categoryToggled, authors: authorToggled }

interface FilterDropdownProps {
  /** The list of the browse state it changes: category names or author ids. */
  filter: Filter
  /** Every option, in the order the list shows them. */
  options: FilterOption[]
}

/**
 * A mobile filter, after the listbox pattern of the APG: a button that opens a
 * list where several options can be chosen. Each choice filters the posts at
 * once, and the list stays open for the next one. The button says what is
 * chosen, and the X next to it clears this filter.
 *
 * The list is placed by the row that holds the dropdowns, which has to be
 * positioned: it opens at the start of the row, so the list of the second
 * dropdown fits the screen as the first one does.
 */
export function FilterDropdown({ filter, options }: FilterDropdownProps) {
  const categories = useAppSelector((state) => state.browse.categories)
  const authors = useAppSelector((state) => state.browse.authors)
  const dispatch = useAppDispatch()
  const { t, locale } = useT()
  const [open, setOpen] = useState(false)
  // The option the keyboard is on. The focus stays on the list, which points
  // at the option through aria-activedescendant.
  const [active, setActive] = useState(0)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()

  const label = t(LABELS[filter])
  // Only the label of a category changes with the language; its value stays the API name.
  const optionLabel = (option: FilterOption) =>
    filter === 'categories' ? categoryLabel(option.label, locale) : option.label
  const selected = filter === 'categories' ? categories : authors
  // In the order they were chosen. A value no option knows, such as an author
  // id from an old link, stays out of the label until the X clears it.
  const chosen = selected.flatMap(
    (value) => {
      const found = options.find((option) => option.value === value)
      return found === undefined ? [] : optionLabel(found)
    },
  )
  const listId = `${id}-list`
  const optionId = (index: number) => `${id}-option-${index}`

  // The list takes the focus when it opens, so the arrows and Esc work at once.
  useEffect(() => {
    if (open) list.current?.focus()
  }, [open])

  const openList = () => {
    // The keyboard starts on the first chosen option, or on the first one.
    const first = options.findIndex((option) => selected.includes(option.value))
    setActive(Math.max(first, 0))
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    button.current?.focus()
  }

  const toggle = (index: number) => {
    setActive(index)
    dispatch(TOGGLES[filter](options[index].value))
  }

  const clear = () => {
    dispatch(filtersApplied({ categories, authors, [filter]: [] }))
    // The X goes away with the choice, so the focus moves to the button.
    button.current?.focus()
  }

  // Esc closes from the button and from the list, and the focus goes back to
  // the button.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    close()
  }

  // Focus that leaves the dropdown (Tab, a tap somewhere else) closes the list.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }

  // The arrows open the list from the button, as Enter and Space do.
  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return
    event.preventDefault()
    openList()
  }

  // In the list, the arrows, Home and End move; Space and Enter choose.
  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (options.length === 0) return
    const last = options.length - 1
    let next: number
    switch (event.key) {
      case 'ArrowDown':
        next = Math.min(active + 1, last)
        break
      case 'ArrowUp':
        next = Math.max(active - 1, 0)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      case ' ':
      case 'Enter':
        event.preventDefault()
        toggle(active)
        return
      default:
        return
    }
    event.preventDefault()
    setActive(next)
    // jsdom has no scrollIntoView; a browser keeps the option in view.
    list.current?.children[next]?.scrollIntoView?.({ block: 'nearest' })
  }

  return (
    <div className={styles.dropdown} onKeyDown={onKeyDown} onBlur={onBlur}>
      <div
        className={
          selected.length > 0 ? `${styles.control} ${styles.selected}` : styles.control
        }
      >
        <button
          ref={button}
          type="button"
          className={styles.button}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onButtonKeyDown}
        >
          {chosen.length > 0 ? (
            <>
              {/* The name keeps the filter: "Category: Technology, Science". */}
              <span className={styles.visuallyHidden}>{label}: </span>
              <span className={styles.label}>{chosen.join(', ')}</span>
            </>
          ) : (
            <span className={styles.label}>{label}</span>
          )}
          {selected.length === 0 ? <Icon name="chevron" className={styles.icon} /> : null}
        </button>
        {selected.length > 0 ? (
          <button
            type="button"
            className={styles.clear}
            aria-label={t(CLEAR_LABELS[filter])}
            onClick={clear}
          >
            <Icon name="close" className={styles.icon} />
          </button>
        ) : null}
      </div>
      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          aria-activedescendant={options.length > 0 ? optionId(active) : undefined}
          tabIndex={0}
          className={styles.listbox}
          onKeyDown={onListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={selected.includes(option.value)}
              className={
                index === active ? `${styles.option} ${styles.active}` : styles.option
              }
              onClick={() => toggle(index)}
            >
              {optionLabel(option)}
              {selected.includes(option.value) ? (
                <Icon name="check" size={20} className={styles.check} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
