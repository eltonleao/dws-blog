import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router'
import type { Location } from 'react-router'
import { AppRoutes } from '../app/AppRoutes'
import { makeStore } from '../app/store'

interface RenderAppOptions {
  /** Shortens the RTK Query timeout, for the slow API test. */
  apiTimeoutMs?: number
}

// Renders nothing: it only reports where the router is.
function LocationProbe({
  onLocation,
}: {
  onLocation: (location: Location) => void
}) {
  const location = useLocation()
  useEffect(() => {
    onLocation(location)
  }, [location, onLocation])
  return null
}

/**
 * Mounts the routes the way the app does, on a MemoryRouter at `route`, with a
 * fresh store whose browse state comes from the query string of that route.
 */
export function renderApp(
  route = '/',
  { apiTimeoutMs }: RenderAppOptions = {},
) {
  const { search } = new URL(route, 'http://localhost')
  const store = makeStore({ apiTimeoutMs, search })

  let current: Location | undefined
  const onLocation = (location: Location) => {
    current = location
  }

  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
        <LocationProbe onLocation={onLocation} />
      </MemoryRouter>
    </Provider>,
  )

  return {
    ...utils,
    store,
    /** The router location right now, read by the probe through `useLocation`. */
    location: (): Location => {
      if (!current) throw new Error('The location probe has not rendered yet')
      return current
    },
  }
}
