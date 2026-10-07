import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './AppRoutes'
import type { AppStore } from './store'

interface AppProps {
  store: AppStore
}

/** The app in the browser: the store, a router on the address bar, and the routes. */
export function App({ store }: AppProps) {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  )
}
