import { useLayoutEffect, useRef, useState } from 'react'
import { useMatch } from 'react-router'
import { useAppSelector } from '../../app/hooks'
import { selectHasPost } from '../../features/posts/selectors'
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/useMediaQuery'
import styles from './Backdrop.module.css'

/**
 * How far apart one cycle of glows starts from the next, in px of the page.
 * On mobile the post's six glows are one cycle of 3314 px (its three glows
 * come back 1657 px lower, at another x), and the list's two follow the same
 * cycle. On desktop each frame is one step: the list's two glows come back
 * every 1111 px, its frame's height, on the same sides; the post's three come
 * back after its 2259 px mirrored, so the glows keep alternating left and
 * right, 740 to 770 px apart, and the cycle is twice that.
 */
const PERIOD = {
  mobile: { list: 3314, post: 3314 },
  desktop: { list: 1111, post: 4518 },
} as const

/**
 * The design's glows under the whole page, moving with it. The post uses the
 * post's set; the list, a page not found and a post still loading or failed,
 * the list's. The layer repeats one cycle down the page as many times as the
 * page is tall, and clips what passes its box, so it adds no scrolling.
 */
export function Backdrop() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const postId = useMatch('/posts/:id')?.params.id
  // Read from the cache, which the post page fills: no other page asks the API for it.
  const found = useAppSelector((state) => postId !== undefined && selectHasPost(state, postId))
  const set = found ? 'post' : 'list'
  const layer = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const element = layer.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const period = PERIOD[isDesktop ? 'desktop' : 'mobile'][set]
  const cycles = Math.floor(height / period) + 1

  return (
    <div ref={layer} className={styles.backdrop} data-set={set} aria-hidden="true">
      {Array.from({ length: cycles }, (_, cycle) => (
        <div key={cycle} className={styles.cycle} style={{ top: cycle * period }} />
      ))}
    </div>
  )
}
