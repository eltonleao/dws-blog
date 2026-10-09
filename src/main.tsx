import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/600.css'
import '@fontsource/open-sans/700.css'
import './styles/tokens.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { makeStore } from './app/store'
import { sessionStore, startTutorialMode } from './tutorial/tutorialMode'

// The query string enters the store once, here. From then on the store is the
// source, and the list page writes it back to the URL. The tutorial mode is
// read before that, because the list drops the keys it does not know.
startTutorialMode(window.location.search, sessionStore())
const store = makeStore({ search: window.location.search })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)
