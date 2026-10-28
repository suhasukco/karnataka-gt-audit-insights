import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/shared/PageLoader'

// Single product: the data dashboard. "/" is the home page; the four live
// pages hang off it. ("/dashboard" is kept as an alias so old links still work.)
const Home = lazy(() => import('@/pages/Home'))
const LiveGeography = lazy(() => import('@/pages/live/LiveGeography'))
const LiveInfrastructure = lazy(() => import('@/pages/live/LiveInfrastructure'))
const LiveCategoryBrand = lazy(() => import('@/pages/live/LiveCategoryBrand'))
const LiveSalesOpportunity = lazy(() => import('@/pages/live/LiveSalesOpportunity'))
const Insights = lazy(() => import('@/pages/live/Insights'))
// The scroll story. Lives outside AppShell — it is a full-bleed nocturnal
// experience and the sidebar/header would compete with the cold open.
const StoryTile = lazy(() => import('@/pages/StoryTile'))
const Story = lazy(() => import('@/pages/Story'))

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <Suspense fallback={<PageLoader />}>
            <AppShell />
          </Suspense>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/live/geography" element={<LiveGeography />} />
        <Route path="/live/infrastructure" element={<LiveInfrastructure />} />
        <Route path="/live/category-brand" element={<LiveCategoryBrand />} />
        <Route path="/live/sales-opportunity" element={<LiveSalesOpportunity />} />
        <Route path="/live/insights" element={<Insights />} />
      </Route>

      {/* Outside the shell on purpose — full-bleed, no chrome. */}
      <Route
        path="/story"
        element={
          <Suspense fallback={<PageLoader />}>
            <Story />
          </Suspense>
        }
      />
      <Route
        path="/story/tokens"
        element={
          <Suspense fallback={<PageLoader />}>
            <StoryTile />
          </Suspense>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
