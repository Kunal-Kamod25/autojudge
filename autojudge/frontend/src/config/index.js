const isProduction = process.env.NODE_ENV === 'production'

const defaultBackendUrl = isProduction
  ? 'https://autojudge-o38g.onrender.com'
  : 'http://localhost:5000'

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  defaultBackendUrl

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || BACKEND_URL

// Keep only public, non-secret values in frontend env variables.
export const PUBLIC_CLIENT_API_KEY = process.env.NEXT_PUBLIC_CLIENT_API_KEY || ''

export const OAUTH_URLS = {
  google: `${BACKEND_URL}/api/auth/google`,
  github: `${BACKEND_URL}/api/auth/github`
}
