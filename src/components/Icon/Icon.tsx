import type { ReactNode } from 'react'

// Drawn for this blog on a 24 grid, in the 2 px line of the design's icons.
// The glyphs keep the design's proportions in the box: the magnifier 18 of
// 24, the arrow and the X about 2/3, the chevron 10 x 6.
const PATHS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="M14.5 14.5 20 20" />
    </>
  ),
  close: <path d="m7 7 10 10M17 7 7 17" />,
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  // Three sliders, each line broken by its knob.
  filters: (
    <path d="M4 6h8m6 0h2M15 3v6M4 12h2m6 0h8M9 9v6M4 18h8m6 0h2M15 15v6" />
  ),
  // An arrow up and an arrow down, side by side and out of step: 12.5 x 16 of
  // ink, in the middle of the box.
  sort: (
    <path d="M9.5 15V5M6.75 7.75 9.5 5l2.75 2.75M14.5 9v10m-2.75-2.75L14.5 19l2.75-2.75" />
  ),
}

export type IconName =
  | 'search'
  | 'close'
  | 'back'
  | 'chevron'
  | 'check'
  | 'filters'
  | 'sort'

interface IconProps {
  name: IconName
  /** The side of the square box, in px. The glyph scales with it. */
  size?: number
  className?: string
}

/**
 * An icon of the design, as inline SVG in the color of the text around it.
 * It is decoration: the control that holds it carries the name.
 */
export function Icon({ name, size = 24, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
