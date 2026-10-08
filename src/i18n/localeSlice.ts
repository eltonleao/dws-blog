import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../app/store'
import type { Locale } from './locale'

/**
 * The language of the interface. The store is born with it (main.tsx reads
 * the storage before the first render), so a reader who chose Spanish never
 * sees a frame in English.
 */
export interface LocaleState {
  locale: Locale
}

export const initialLocaleState: LocaleState = { locale: 'en' }

const localeSlice = createSlice({
  name: 'locale',
  initialState: initialLocaleState,
  reducers: {
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload
    },
  },
})

export const { setLocale } = localeSlice.actions
export const localeReducer = localeSlice.reducer

export const selectLocale = (state: RootState): Locale => state.locale.locale
