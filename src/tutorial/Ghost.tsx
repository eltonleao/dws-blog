import { useEffect, useRef, type RefObject } from 'react'
import type { Target } from './steps'
import { findTarget } from './targets'
import styles from './Tutorial.module.css'

interface GhostProps {
  target: Target
  /** The tour's card: the ghost leaves from it. */
  from: RefObject<HTMLElement | null>
}

/**
 * A pointer that travels from the card to the element of the step and stops
 * there, pulsing: the gesture is shown, and the reader is the one who acts.
 * It follows the element on every frame, so scrolling and resizing keep it
 * on target. With reduced motion it appears on the element, still.
 */
export function Ghost({ target, from }: GhostProps) {
  const ghost = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ghost.current
    if (node === null) return
    const card = from.current?.getBoundingClientRect()
    if (card !== undefined) {
      node.style.transition = 'none'
      node.style.transform = `translate(${card.left + 32}px, ${card.top + 24}px)`
      // Reading the box commits the start, so the move below is animated.
      node.getBoundingClientRect()
      node.style.transition = ''
    }
    const arrive = () => {
      node.dataset.arrived = ''
    }
    node.addEventListener('transitionend', arrive)
    let frame = requestAnimationFrame(function follow() {
      const element = findTarget(target)
      if (element === null) {
        node.dataset.lost = ''
      } else {
        delete node.dataset.lost
        const box = element.getBoundingClientRect()
        node.style.transform = `translate(${box.left + box.width / 2}px, ${box.top + box.height / 2}px)`
      }
      frame = requestAnimationFrame(follow)
    })
    return () => {
      cancelAnimationFrame(frame)
      node.removeEventListener('transitionend', arrive)
    }
  }, [target, from])

  return (
    <div ref={ghost} className={styles.ghost} data-tour="ghost" aria-hidden="true">
      <span className={styles.pulse} />
      <svg className={styles.pointer} viewBox="0 0 16 24" width="16" height="24">
        <path d="M1 1v18.5l4.6-4.4 3.1 7.2 3-1.3-3.1-7.1H15z" />
      </svg>
    </div>
  )
}
