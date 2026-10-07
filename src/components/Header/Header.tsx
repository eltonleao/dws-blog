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
      <Link to="/" className={styles.logo}>
        dentsu world services
      </Link>
      {children}
    </header>
  )
}
