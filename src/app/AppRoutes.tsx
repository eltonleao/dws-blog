import { Route, Routes } from 'react-router'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PostListPage } from '../pages/PostListPage'
import { PostPage } from '../pages/PostPage'

/** The routes of the app, mounted by the browser entry point and by the tests. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PostListPage />} />
      <Route path="/posts/:id" element={<PostPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
