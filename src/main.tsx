import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/600.css'
import '@fontsource/open-sans/700.css'
import './styles/tokens.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { makeStore } from './app/store'
import { readStoredLocale } from './i18n/locale'

// The query string enters the store once, here. From then on the store is the
// source, and the list page writes it back to the URL. The stored language
// enters here too, before the first render, so nothing is painted in English
// for a reader who chose Spanish.
const store = makeStore({ search: window.location.search, locale: readStoredLocale() })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)
