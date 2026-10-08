import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router'
import type { Location } from 'react-router'
import { AppRoutes } from '../app/AppRoutes'
import { makeStore } from '../app/store'
import type { Locale } from '../i18n/locale'

interface RenderLocalizedOptions {
  /** The language the store starts in, as main.tsx gives it from the storage. */
  locale?: Locale
  /** Which entry of `entries` the router starts on: the last one by default. */
  index?: number
}

function LocationProbe({ onLocation }: { onLocation: (location: Location) => void }) {
  const location = useLocation()
  useEffect(() => {
    onLocation(location)
  }, [location, onLocation])
  return null
}

/**
 * Like renderApp, with the two things the language tests need: the locale the
 * store is born with (the way main.tsx pre-loads it) and a history of more than
 * one entry (a reader who came from the list to /proof). The browse state
 * comes from the first entry, the page the reader opened.
 */
export function renderLocalized(
  entries: string | string[],
  { locale = 'en', index }: RenderLocalizedOptions = {},
) {
  const list = typeof entries === 'string' ? [entries] : entries
  const { search } = new URL(list[0], 'http://localhost')
  const store = makeStore({ locale, search })

  let current: Location | undefined
  const onLocation = (location: Location) => {
    current = location
  }

  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={list} initialIndex={index ?? list.length - 1}>
        <AppRoutes />
        <LocationProbe onLocation={onLocation} />
      </MemoryRouter>
    </Provider>,
  )

  return {
    ...utils,
    store,
    location: (): Location => {
      if (!current) throw new Error('The location probe has not rendered yet')
      return current
    },
  }
}
