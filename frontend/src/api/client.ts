import axios from 'axios'
import { useAuthStore } from '../store/auth'

// Client HTTP : JWT injecté + refresh automatique sur 401
export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  const access = useAuthStore.getState().tokens?.access
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

let refreshing: Promise<string | null> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const { tokens, setTokens, logout } = useAuthStore.getState()
    if (error.response?.status === 401 && tokens?.refresh && !original._retry) {
      original._retry = true
      refreshing ??= axios
        .post('/api/v1/auth/refresh/', { refresh: tokens.refresh })
        .then((r) => {
          setTokens({ access: r.data.access, refresh: r.data.refresh })
          return r.data.access as string
        })
        .catch(() => {
          logout()
          return null
        })
        .finally(() => {
          refreshing = null
        })
      const access = await refreshing
      if (access) {
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)
