import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

// Garde de routes : redirige vers /connexion si non authentifié
export default function RequireAuth({ children }: { children: ReactNode }) {
  const tokens = useAuthStore((s) => s.tokens)
  const location = useLocation()
  if (!tokens) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
