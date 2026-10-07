import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useGetPostsQuery } from '../api/postsApi'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { Button } from '../components/Button/Button'
import { FilterDropdown } from '../components/FilterDropdown/FilterDropdown'
import { FilterSidebar } from '../components/FilterSidebar/FilterSidebar'
import { Header } from '../components/Header/Header'
import { PostCard } from '../components/PostCard/PostCard'
import { SearchField } from '../components/SearchField/SearchField'
import { SearchPanel } from '../components/SearchPanel/SearchPanel'
import { SortButton } from '../components/SortButton/SortButton'
import { StatusMessage } from '../components/StatusMessage/StatusMessage'
import { filtersCleared } from '../features/browse/browseSlice'
import { useBrowseUrlSync } from '../features/browse/useBrowseUrlSync'
import { filterOptions } from '../features/posts/filterOptions'
import { selectVisiblePosts } from '../features/posts/selectors'
import type { Post } from '../features/posts/types'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import styles from './PostListPage.module.css'

// While the posts load, the grid holds empty cards: two rows on desktop.
const SKELETON_CARDS = 6

// The filters have no options until the posts come.
const NO_POSTS: Post[] = []

/**
 * The list of posts, with the search, the filters and the order of the browse
 * state, which the page mirrors to the URL. Mobile and desktop mount different
 * controls, and only the ones of the current breakpoint are in the page.
 */
export function PostListPage() {
  useBrowseUrlSync()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { data, isError, refetch } = useGetPostsQuery()
  const posts = useAppSelector(selectVisiblePosts)
  const dispatch = useAppDispatch()
  // The mobile search panel is the page's own state, and nothing the cards
  // receive depends on it: opening and closing it renders no card again.
  const [searchOpen, setSearchOpen] = useState(false)
  const searchButton = useRef<HTMLButtonElement>(null)
  const panelOpen = searchOpen && !isDesktop
  // From every post, not from the ones the search and the filters leave.
  const options = filterOptions(data ?? NO_POSTS)

  const closeSearch = () => {
    // The button is inert while the panel is open: the page renders without
    // the panel first, and only then can the button take the focus back.
    flushSync(() => setSearchOpen(false))
    searchButton.current?.focus()
  }

  // A failed first load is an error; a retry after it loads like the first time.
  let content: ReactNode
  if (data === undefined && isError) {
    content = (
      <StatusMessage role="alert" message="Something went wrong">
        <Button onClick={() => refetch()}>Try again</Button>
      </StatusMessage>
    )
  } else if (data === undefined) {
    content = (
      <>
        <StatusMessage message="Loading posts" />
        <ul className={styles.grid} aria-hidden="true">
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <li key={index} className={styles.skeleton} />
          ))}
        </ul>
      </>
    )
  } else if (posts.length === 0) {
    content = (
      <StatusMessage message="No posts found">
        <Button onClick={() => dispatch(filtersCleared())}>Clear filters</Button>
      </StatusMessage>
    )
  } else {
    content = (
      <ul className={styles.grid}>
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      {/* Under the open search panel the page stays mounted, out of reach. */}
      <div inert={panelOpen}>
        <Header>
          {isDesktop ? (
            <SearchField />
          ) : (
            <button
              ref={searchButton}
              type="button"
              className={styles.searchButton}
              aria-label="Search"
              aria-expanded={panelOpen}
              onClick={() => setSearchOpen(true)}
            >
              <span aria-hidden="true">⌕</span>
            </button>
          )}
        </Header>
        {/* In the page, the filters come before the order, so Tab reaches
            them first; the grid areas put the order next to the title. */}
        <main className={styles.main}>
          {/* The design shows the title on desktop only; on mobile it stays
              as the heading of the page for screen readers. */}
          <h1 className={isDesktop ? styles.title : styles.visuallyHidden}>
            DWS blog
          </h1>
          {isDesktop ? (
            <div className={styles.sidebar}>
              <FilterSidebar options={options} />
            </div>
          ) : (
            <div className={styles.dropdowns}>
              <FilterDropdown filter="categories" options={options.categories} />
              <FilterDropdown filter="authors" options={options.authors} />
            </div>
          )}
          <div className={styles.sort}>
            <SortButton />
          </div>
          <div className={styles.results}>{content}</div>
        </main>
      </div>
      {panelOpen ? <SearchPanel onClose={closeSearch} /> : null}
    </>
  )
}
