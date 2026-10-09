import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon/Icon'
import { formatDate } from '../lib/formatDate'
import { AREA_ORDER } from '../proof/areas.ts'
import { parseProof } from '../proof/parseProof.ts'
import rawProof from '../proof/proof.json'
import type { Level, ProofLine } from '../proof/types.ts'
import styles from './ProofPage.module.css'

// Read once, when the chunk of the page loads: a proof.json out of shape
// throws here, and the boundary of the route shows its message.
const proof = parseProof(rawProof)

const REPOSITORY = 'https://github.com/eltonleao/dws-blog'

const LEVEL_LABEL: Record<Level, string> = {
  unit: 'Unit test',
  component: 'Component test',
  browser: 'Browser test',
  design: 'Design measure',
}

const AREAS = AREA_ORDER.map((area) => ({
  area,
  lines: proof.lines.filter((line) => line.area === area),
}))

/**
 * The bug hunt: every bug planted in a copy of the code during the mutation
 * runs, as a closed card by area, and the test that caught it. A card opens
 * on the change and on the failure of the test. Which cards were opened lives
 * in this visit only: there is no score to keep.
 */
export function ProofPage() {
  const heading = useRef<HTMLHeadingElement>(null)
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set())

  // The page opens at the top, also from the footer at the end of a long list,
  // and its title takes the focus, as a post's does.
  useLayoutEffect(() => {
    if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  const toggle = (id: string) => {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setSeen((current) => (current.has(id) ? current : new Set(current).add(id)))
  }

  const caught = proof.lines.filter((line) => line.caught).length

  return (
    <main className={styles.main}>
      <title>Bug hunt | DWS Blog</title>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>The bug hunt</p>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>
          {caught} of {proof.lines.length} planted bugs caught
        </h1>
        <p className={styles.text}>
          Each card is a bug planted on purpose in a copy of this blog's code,
          next to the test that caught it. Open a card to see the change and how
          the test failed.
        </p>
        <p className={styles.meta}>
          <span>
            Checked at commit{' '}
            <a className={styles.link} href={`${REPOSITORY}/commit/${proof.commit}`}>
              <code className={styles.hash}>{proof.commit.slice(0, 7)}</code>
            </a>{' '}
            on <time dateTime={proof.ranAt}>{formatDate(proof.ranAt)}</time>
          </span>
          <span className={styles.dot} aria-hidden="true" />
          <a className={styles.link} href={`${REPOSITORY}/actions/workflows/ci.yml`}>
            CI runs
          </a>
        </p>
      </div>

      <div className={styles.areas}>
        {AREAS.map(({ area, lines }) => {
          const opened = lines.filter((line) => seen.has(line.id)).length
          const headingId = `area-${area.toLowerCase()}`
          return (
            <section key={area} className={styles.area} aria-labelledby={headingId}>
              <div className={styles.areaHead}>
                <h2 id={headingId} className={styles.areaTitle}>
                  {area}
                </h2>
                <p className={styles.counter}>
                  {opened} of {lines.length} opened
                </p>
                <div className={styles.track} aria-hidden="true">
                  <div
                    className={styles.fill}
                    style={{ transform: `scaleX(${opened / lines.length})` }}
                  />
                </div>
              </div>
              <ul className={styles.cards}>
                {lines.map((line) => (
                  <ProofCard
                    key={line.id}
                    line={line}
                    open={open.has(line.id)}
                    onToggle={() => toggle(line.id)}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}

interface ProofCardProps {
  line: ProofLine
  open: boolean
  onToggle: () => void
}

/**
 * One planted bug. Closed, the card shows the level and the title of the test,
 * which is the name of its button; open, the change in each file, before and
 * after, and how the test failed.
 */
function ProofCard({ line, open, onToggle }: ProofCardProps) {
  const panelId = `bug-${line.id}`
  // The title starts with the id of its line; the id gets a tag of its own.
  const rest = line.test.startsWith(`${line.id} `)
    ? line.test.slice(line.id.length + 1)
    : null

  return (
    <li className={styles.card} data-open={open || undefined}>
      <div className={styles.head}>
        <p className={styles.level}>
          <span className={styles.suit} data-level={line.level} aria-hidden="true" />
          {LEVEL_LABEL[line.level]}
        </p>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className={styles.name}>
            {rest === null ? (
              line.test
            ) : (
              <>
                <span className={styles.id}>{line.id}</span>{' '}
                {rest}
              </>
            )}
          </span>
          <span className={styles.chevron}>
            <Icon name="chevron" size={8.3} />
          </span>
        </button>
      </div>
      <div id={panelId} className={styles.panel} hidden={!open}>
        {line.changes.map((change, index) => (
          <div key={index} className={styles.change}>
            <p className={styles.file}>{change.file}</p>
            <p className={styles.label}>Before</p>
            <pre className={styles.code}>
              <code>{change.before}</code>
            </pre>
            <p className={`${styles.label} ${styles.labelAfter}`}>After</p>
            <pre className={`${styles.code} ${styles.after}`}>
              <code>{change.after}</code>
              {change.after === '' ? (
                <span className={styles.removed}>the line is removed</span>
              ) : null}
            </pre>
          </div>
        ))}
        <p className={styles.label}>How the test failed</p>
        <pre className={styles.failure}>{line.failure.join('\n')}</pre>
        <p className={styles.caught}>
          <span>Caught in {line.seconds} s</span>
          <span className={styles.dot} aria-hidden="true" />
          <code className={styles.testFile}>{line.testFile}</code>
        </p>
      </div>
    </li>
  )
}
