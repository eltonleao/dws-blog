// The wordmark's own face, the one eltonleao.dev signs with. Only the 800,
// and here rather than in main.tsx: the rest of the blog never uses it.
import '@fontsource/syne/800.css'
import { useEffect, useRef, useState } from 'react'
import styles from './Signature.module.css'

const URL = 'https://eltonleao.dev'
const NAME = 'eltonleao'
const TLD = '.dev'

/**
 * The four vertices of K4, the complete graph of four nodes, drawn as a
 * tetrahedron in a 120 x 120 box. A, B and C are the front face; D is the
 * vertex at the back, so it is drawn smaller.
 */
const A = [60, 14] as const
const B = [12, 100] as const
const C = [108, 100] as const
const D = [60, 64] as const

/**
 * The six edges. The three that reach the back vertex are fainter: with all
 * six alike the figure reads as a triangle with a dot inside. The delay ties
 * each edge to the node the pulse is leaving: A at 0 s, B at 1.1 s, C at
 * 2.2 s, D at 3.3 s, over a cycle of 4.4 s.
 */
const EDGES = [
  { from: A, to: B, back: false, delay: 0.45 },
  { from: B, to: C, back: false, delay: 1.55 },
  { from: C, to: A, back: false, delay: 2.65 },
  { from: A, to: D, back: true, delay: 3.75 },
  { from: B, to: D, back: true, delay: 1.0 },
  { from: C, to: D, back: true, delay: 2.1 },
] as const

/** Science, technology, art and philosophy, in the order of the pulse. */
const NODES = [
  { at: A, r: 9.5, delay: 0 },
  { at: B, r: 9.5, delay: 1.1 },
  { at: C, r: 9.5, delay: 2.2 },
  { at: D, r: 8, delay: 3.3 },
] as const

/** Drawn rather than an emoji, so it takes a token color. */
const HEART =
  'M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

/**
 * The author's signature, the one at the foot of the author's sites: the K4
 * of eltonleao.dev, small and alive. It draws itself the first time it scrolls
 * into view, and a pulse then runs through the nodes. The four pillars the
 * nodes stand for show on hover, out of the flow, so no hover moves the
 * footer.
 */
export function Signature() {
  const ref = useRef<HTMLDivElement>(null)
  // Without IntersectionObserver the signature starts lit: what is lost is
  // the entrance, never the signature.
  const [lit, setLit] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const target = ref.current
    if (!target || lit) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setLit(true)
        observer.disconnect()
      },
      { threshold: 0.6 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [lit])

  const letters = [...NAME, ...TLD]

  return (
    <div ref={ref} className={lit ? `${styles.signature} ${styles.lit}` : styles.signature}>
      <a
        href={URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="eltonleao.dev: science, technology, art and philosophy (opens in a new tab)"
        className={styles.link}
      >
        <span className={styles.lockup}>
          <span className={styles.mark}>
            <span className={styles.halo} aria-hidden="true" />
            <svg viewBox="0 0 120 120" className={styles.graph} aria-hidden="true" focusable="false">
              {EDGES.map((edge, i) => (
                <line
                  key={i}
                  className={edge.back ? styles.backEdge : styles.edge}
                  x1={edge.from[0]}
                  y1={edge.from[1]}
                  x2={edge.to[0]}
                  y2={edge.to[1]}
                  // The draw-in delay first, then the pulse delay, in the order
                  // the animations are declared in the CSS.
                  style={{ animationDelay: `${0.05 + i * 0.06}s, ${edge.delay}s` }}
                />
              ))}
              {NODES.map((node, i) => (
                <circle
                  key={i}
                  className={styles.node}
                  cx={node.at[0]}
                  cy={node.at[1]}
                  r={node.r}
                  style={{ animationDelay: `${0.5 + i * 0.07}s, ${node.delay}s` }}
                />
              ))}
            </svg>
          </span>

          <span className={styles.lead}>
            Made with
            <svg viewBox="0 0 24 24" className={styles.heart} aria-hidden="true" focusable="false">
              <path d={HEART} />
            </svg>
            by
          </span>

          <span className={styles.word}>
            {letters.map((letter, i) => (
              <span key={i} className={styles.mask}>
                <span
                  className={i >= NAME.length ? `${styles.letter} ${styles.tld}` : styles.letter}
                  style={{ animationDelay: `${0.55 + i * 0.028}s` }}
                >
                  {letter}
                </span>
              </span>
            ))}
          </span>
        </span>

        <span className={styles.pillars}>Science · Technology · Art · Philosophy</span>
      </a>
    </div>
  )
}
