import { Route, Routes } from 'react-router'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PostListPage } from '../pages/PostListPage'
import { PostPage } from '../pages/PostPage'
import { AppLayout } from './AppLayout'

/**
 * The routes of the app, mounted by the browser entry point and by the tests.
 * Every page sits in the layout, which holds the header and the search.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<PostListPage />} />
        <Route path="/posts/:id" element={<PostPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
