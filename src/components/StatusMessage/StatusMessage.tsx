import type { ReactNode } from 'react'
import styles from './StatusMessage.module.css'

interface StatusMessageProps {
  /** What the reader is told, such as "Loading posts" or "No posts found". */
  message: string
  /**
   * How a screen reader hears it: a status waits for a pause, an alert (for an
   * error) is read at once.
   */
  role?: 'status' | 'alert'
  /** The way out of the state, such as Try again or Clear filters. */
  children?: ReactNode
}

/** What takes the place of the content while it loads, when it fails, or when it is empty. */
export function StatusMessage({
  message,
  role = 'status',
  children,
}: StatusMessageProps) {
  return (
    <div className={styles.status} role={role}>
      <p>{message}</p>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </div>
  )
}
