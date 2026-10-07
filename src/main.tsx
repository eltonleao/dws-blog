import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { makeStore } from './app/store'

// The query string enters the store once, here. From then on the store is the
// source, and the list page writes it back to the URL.
const store = makeStore({ search: window.location.search })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)
