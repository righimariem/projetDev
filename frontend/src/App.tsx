import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PublicLayout, RequireRole, WorkspaceLayout } from './homey/layouts'
import { ToastHost } from './homey/ui'
import HomePage from './homey/pages/Home'
import ExplorePage from './homey/pages/Explore'
import ListingDetailPage from './homey/pages/ListingDetail'
import AiSearchPage from './homey/pages/AiSearch'
import RoommatesPage from './homey/pages/Roommates'
import AiFeaturesPage from './homey/pages/AiFeatures'
import HowItWorksPage from './homey/pages/HowItWorks'
import { LoginPage, RegisterPage } from './homey/pages/Auth'
import MessagesPage from './homey/pages/Messages'
import ProfilePage from './homey/pages/Profile'
import OwnerDashboard from './homey/pages/owner/Dashboard'
import OwnerListings from './homey/pages/owner/Listings'
import AddProperty from './homey/pages/owner/AddProperty'
import OwnerRequests from './homey/pages/owner/Requests'
import OwnerNotifications from './homey/pages/owner/Notifications'
import OwnerProfile from './homey/pages/owner/Profile'
import { AdminAlerts, AdminDashboard, AdminPending } from './homey/pages/admin/Admin'
import {
  AdminListings,
  AdminMatching,
  AdminSettings,
  AdminStatistics,
  AdminUsers,
} from './homey/pages/admin/AdminMisc'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Auth — plein écran, sans en-tête public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<RegisterPage />} />

          {/* Site public */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/properties" element={<ExplorePage />} />
            <Route path="/properties/:id" element={<ListingDetailPage />} />
            <Route path="/search/ai" element={<AiSearchPage />} />
            <Route path="/roommates" element={<RoommatesPage />} />
            <Route path="/ai-features" element={<AiFeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:id" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/favoris" element={<Navigate to="/profile?tab=favorites" replace />} />
          </Route>

          {/* Espace propriétaire */}
          <Route
            element={
              <RequireRole role="owner">
                <WorkspaceLayout role="owner" />
              </RequireRole>
            }
          >
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/owner/listings" element={<OwnerListings />} />
            <Route path="/owner/listings/new" element={<AddProperty />} />
            <Route path="/owner/listings/:id/edit" element={<AddProperty />} />
            <Route path="/owner/messages" element={<MessagesPage />} />
            <Route path="/owner/messages/:id" element={<MessagesPage />} />
            <Route path="/owner/requests" element={<OwnerRequests />} />
            <Route path="/owner/notifications" element={<OwnerNotifications />} />
            <Route path="/owner/profile" element={<OwnerProfile />} />
          </Route>

          {/* Administration */}
          <Route
            element={
              <RequireRole role="admin">
                <WorkspaceLayout role="admin" />
              </RequireRole>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/listings" element={<AdminListings />} />
            <Route path="/admin/pending" element={<AdminPending />} />
            <Route path="/admin/alerts" element={<AdminAlerts />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/owners" element={<AdminUsers role="owner" />} />
            <Route path="/admin/tenants" element={<AdminUsers role="tenant" />} />
            <Route path="/admin/matching" element={<AdminMatching />} />
            <Route path="/admin/statistics" element={<AdminStatistics />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastHost />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
