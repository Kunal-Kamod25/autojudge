"use client"
// This file drives the ProfileRedirect feature flow and keeps the behavior easy to reason about.
import { redirect } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ProfileRedirect handles one focused part of this file's workflow.
export default function ProfileRedirect() {
  const { user } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (user?._id) router.push(`/profile/${user._id}`)
    else router.push('/auth/login')
  }, [user, router])
  return <div className="min-h-screen bg-navy flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" />
  </div>
}
