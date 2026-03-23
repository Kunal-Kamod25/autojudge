"use client"
// This file drives the page feature flow and keeps the behavior easy to reason about.
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import axios from 'axios'
import { BACKEND_URL } from '@/config'

// OAuthCallbackPageContent handles one focused part of this file's workflow.
function OAuthCallbackPageContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuthStore()

  useEffect(() => {
    const error = params.get('error')

    if (error) {
      router.replace('/auth/login?error=oauth_failed')
      return
    }

    // Fetch user info from secure auth cookies
    axios.get(`${BACKEND_URL}/api/auth/me`, {
      withCredentials: true
    }).then(({ data }) => {
        login(data.user)
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

// OAuthCallbackPage handles one focused part of this file's workflow.
export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy" />}>
      <OAuthCallbackPageContent />
    </Suspense>
  )
}
