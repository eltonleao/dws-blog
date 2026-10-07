import type { ComponentProps } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ComponentProps<'button'> {
  /** Primary is filled, for the main action of a screen; secondary is outlined, for Back. */
  variant?: 'primary' | 'secondary'
}

/** A button of the design. It does not submit a form unless it is given `type="submit"`. */
export function Button({
  variant = 'primary',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ')
  return <button type={type} className={classes} {...props} />
}
