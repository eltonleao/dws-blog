import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { ChunkBoundary } from '../components/ChunkBoundary/ChunkBoundary'
import { useT } from '../i18n/useT'
import { StatusMessage } from '../components/StatusMessage/StatusMessage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PostListPage } from '../pages/PostListPage'
import { PostPage } from '../pages/PostPage'
import { AppLayout } from './AppLayout'

// The bug hunt and its data load in a chunk of their own, on the way to
// /proof: the list and the post never ask for them.
const ProofPage = lazy(() => import('../pages/ProofPage.tsx').then((module) => ({ default: module.ProofPage })))

function ChunkLoading() {
  const { t } = useT()
  return <StatusMessage message={t('chunk.loading')} />
}

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
        <Route
          path="/proof"
          element={
            <ChunkBoundary>
              <Suspense fallback={<ChunkLoading />}>
                <ProofPage />
              </Suspense>
            </ChunkBoundary>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
