import type { ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './Header.module.css'

interface HeaderProps {
  /**
   * The search of the breakpoint, at the right: the field on desktop, the
   * button that opens the search panel on mobile.
   */
  children?: ReactNode
}

export function Header({ children }: HeaderProps) {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo} aria-label="dentsu world services">
        {/* The name set in the box of the drawn mark, so the mark can take its
            place without moving the header. */}
        <svg
          className={styles.mark}
          width="203.5"
          height="21.5"
          viewBox="0 0 203.5 21.5"
          aria-hidden="true"
          focusable="false"
        >
          <text
            className={styles.name}
            x="0"
            y="20.5"
            textLength="100"
            lengthAdjust="spacingAndGlyphs"
          >
            dentsu
          </text>
          <text
            className={styles.tagline}
            x="110"
            y="20.5"
            textLength="93.5"
            lengthAdjust="spacingAndGlyphs"
          >
            world services
          </text>
        </svg>
      </Link>
      {children}
    </header>
  )
}
