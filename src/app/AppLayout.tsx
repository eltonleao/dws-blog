import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, useLocation } from 'react-router'
import { Backdrop } from '../components/Backdrop/Backdrop'
import { Footer } from '../components/Footer/Footer'
import { Header } from '../components/Header/Header'
import { Icon } from '../components/Icon/Icon'
import { SearchField } from '../components/SearchField/SearchField'
import { SearchPanel } from '../components/SearchPanel/SearchPanel'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import styles from './AppLayout.module.css'

/**
 * The frame of every page: the header with the search, over the page of the
 * route, and the footer under it. It stays mounted from one route to the
 * next, so the search typed on a post keeps its field, and its focus, when the
 * list takes the post's place.
 */
export function AppLayout() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { pathname } = useLocation()
  // The mobile search panel is the layout's own state, and nothing the page
  // receives depends on it: opening and closing it renders no card again.
  const [searchOpen, setSearchOpen] = useState(false)
  const [shownPathname, setShownPathname] = useState(pathname)
  const searchButton = useRef<HTMLButtonElement>(null)
  const panelOpen = searchOpen && !isDesktop

  // The panel goes along to the list its typing opens. Any other page, a
  // title picked in the panel or the browser's Back, closes it.
  if (pathname !== shownPathname) {
    setShownPathname(pathname)
    if (pathname !== '/') setSearchOpen(false)
  }

  const closeSearch = () => {
    // The button is inert while the panel is open: the page renders without
    // the panel first, and only then can the button take the focus back.
    flushSync(() => setSearchOpen(false))
    searchButton.current?.focus()
  }

  return (
    <>
      {/* Under the open search panel the page stays mounted, out of reach. The
          glows of the background sit under it and move with it. */}
      <div inert={panelOpen} className={styles.page}>
        <Backdrop />
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
              <Icon name="searchSmall" />
            </button>
          )}
        </Header>
        <Outlet />
        <Footer />
      </div>
      {panelOpen ? <SearchPanel onClose={closeSearch} /> : null}
    </>
  )
}
