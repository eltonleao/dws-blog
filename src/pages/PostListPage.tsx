import type { ReactNode } from 'react'
import { useGetPostsQuery } from '../api/postsApi'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { Button } from '../components/Button/Button'
import { Header } from '../components/Header/Header'
import { PostCard } from '../components/PostCard/PostCard'
import { SearchField } from '../components/SearchField/SearchField'
import { SortButton } from '../components/SortButton/SortButton'
import { StatusMessage } from '../components/StatusMessage/StatusMessage'
import { filtersCleared } from '../features/browse/browseSlice'
import { useBrowseUrlSync } from '../features/browse/useBrowseUrlSync'
import { selectVisiblePosts } from '../features/posts/selectors'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import styles from './PostListPage.module.css'

// While the posts load, the grid holds empty cards: two rows on desktop.
const SKELETON_CARDS = 6

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
      <Header>{isDesktop ? <SearchField /> : null}</Header>
      <main>
        <div className={styles.toolbar}>
          {/* The design shows the title on desktop only; on mobile it stays
              as the heading of the page for screen readers. */}
          <h1 className={isDesktop ? styles.title : styles.visuallyHidden}>
            DWS blog
          </h1>
          <SortButton />
        </div>
        <div className={styles.columns}>
          <div className={styles.results}>{content}</div>
        </div>
      </main>
    </>
  )
}
