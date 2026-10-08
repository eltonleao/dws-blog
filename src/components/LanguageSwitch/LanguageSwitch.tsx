import { useT } from '../../i18n/useT'
import { LOCALES } from '../../i18n/locale'
import type { Locale } from '../../i18n/locale'
import styles from './LanguageSwitch.module.css'

// Each language by its own name, the same in every language of the interface:
// a reader who cannot read the current one still finds theirs.
const NAMES: Record<Locale, { name: string; short: string }> = {
  en: { name: 'English', short: 'EN' },
  es: { name: 'Español', short: 'ES' },
}

/**
 * The two languages of the interface, side by side in the header. Each is a
 * button that says whether it is the current one; a change re-renders the
 * texts in place, with no navigation, so the page keeps its scroll and focus.
 */
export function LanguageSwitch() {
  const { t, locale, setLocale } = useT()

  return (
    <div role="group" aria-label={t('language.label')} className={styles.switch}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className={styles.button}
          aria-label={NAMES[option].name}
          aria-pressed={option === locale}
          onClick={() => {
            if (option !== locale) setLocale(option)
          }}
        >
          {NAMES[option].short}
        </button>
      ))}
    </div>
  )
}
