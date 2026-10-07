import { configure } from '@testing-library/react'

// The /proof page is a lazy chunk, and its first load on a slow machine takes
// longer than the one second that findBy* queries wait by default.
configure({ asyncUtilTimeout: 5000 })
