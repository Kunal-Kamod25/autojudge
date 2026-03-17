"use client"
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import axios from 'axios'
import { BACKEND_URL } from '@/config'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuthStore()

  useEffect(() => {
    const token = params.get('token')
    const error = params.get('error')

    if (error || !token) {
      router.replace('/auth/login?error=oauth_failed')
      return
    }

    // Fetch user info using the token
    axios.get(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true
    }).then(({ data }) => {
        login(data.user, token)
        const role = data.user?.role
        if (role === 'teacher') router.replace('/teacher/dashboard')
        else if (role === 'admin') router.replace('/admin')
        else router.replace('/student/dashboard')
      })
      .catch(() => {
        router.replace('/auth/login?error=oauth_failed')
      })
  }, [])

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-cyan border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Signing you in...</p>
      </div>
    </div>
  )
}
