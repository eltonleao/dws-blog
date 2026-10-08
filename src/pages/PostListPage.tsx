import { useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useGetPostsQuery } from '../api/postsApi'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { Button } from '../components/Button/Button'
import { FilterDropdown } from '../components/FilterDropdown/FilterDropdown'
import { FilterSidebar } from '../components/FilterSidebar/FilterSidebar'
import { PostCard } from '../components/PostCard/PostCard'
import { SortButton } from '../components/SortButton/SortButton'
import { StatusMessage } from '../components/StatusMessage/StatusMessage'
import { filtersCleared, listScrollSaved } from '../features/browse/browseSlice'
import { useBrowseUrlSync } from '../features/browse/useBrowseUrlSync'
import { filterOptions } from '../features/posts/filterOptions'
import { selectVisiblePosts } from '../features/posts/selectors'
import type { Post } from '../features/posts/types'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import styles from './PostListPage.module.css'

// While the posts load, the grid holds empty cards: two rows on desktop.
const SKELETON_CARDS = 6

// A long list draws this many cards first and then this many more at a time,
// so the first card does not wait for every card to render and the page stays
// responsive while the rest comes.
const FIRST_CARDS = 48
const NEXT_CARDS = 96

// The filters have no options until the posts come.
const NO_POSTS: Post[] = []

/**
 * The list of posts, with the filters and the order of the browse state, and
 * the search of the header, which the page mirrors to the URL. Mobile and
 * desktop mount different controls, and only the ones of the current
 * breakpoint are in the page.
 */
export function PostListPage() {
  useBrowseUrlSync()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { data, isError, refetch } = useGetPostsQuery()
  const posts = useAppSelector(selectVisiblePosts)
  const listScrollY = useAppSelector((state) => state.browse.listScrollY)
  const dispatch = useAppDispatch()
  // From every post, not from the ones the search and the filters leave.
  const options = filterOptions(data ?? NO_POSTS)
  // How many posts the list shows, for screen readers: the region speaks when
  // the search or the filters change it, and an order changes nothing. The
  // design draws no count, and an empty list has its own status.
  const count =
    data === undefined || posts.length === 0
      ? ''
      : `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`

  // A reader coming back to a scrolled list gets every card at once, so the
  // saved position still has the height it needs.
  const [limit, setLimit] = useState(listScrollY > 0 ? Infinity : FIRST_CARDS)
  useEffect(() => {
    if (limit >= posts.length) return
    const handle = window.setTimeout(() => setLimit((current) => current + NEXT_CARDS), 16)
    return () => window.clearTimeout(handle)
  }, [limit, posts.length])

  // The list opens where the reader left it for a post. The cleanup of a
  // layout effect runs before the list leaves the page, while the page still
  // has the height of the list, so the position it saves is the one the
  // reader saw; the browser restores nothing the list has not drawn yet.
  useLayoutEffect(() => {
    if (window.scrollY !== listScrollY) {
      window.scrollTo({ top: listScrollY, behavior: 'instant' })
    }
    return () => {
      dispatch(listScrollSaved(window.scrollY))
    }
  }, [dispatch, listScrollY])

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
        {posts.slice(0, limit).map((post) => (
          <li key={post.id} className={styles.cell}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    )
  }

  // The header and the search are the layout's, over every page. In the
  // page, the filters come before the order, so Tab reaches them first; the
  // grid areas put the order next to the title.
  return (
    <main className={styles.main}>
      {/* The design shows the title on desktop only; on mobile it stays as
          the heading of the page for screen readers. */}
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
      <div className={styles.results}>
        <div className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
          {count}
        </div>
        {content}
      </div>
    </main>
  )
}
