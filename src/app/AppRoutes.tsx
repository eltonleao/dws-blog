import { Route, Routes } from 'react-router'
import { PostListPage } from '../pages/PostListPage'

/** The routes of the app, mounted by the browser entry point and by the tests. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PostListPage />} />
    </Routes>
  )
}
