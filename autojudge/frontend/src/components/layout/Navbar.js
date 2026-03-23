"use client"
// This file drives the Navbar feature flow and keeps the behavior easy to reason about.
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Code2, LogOut, User, ChevronDown, Trophy, BookOpen,
         LayoutDashboard, Settings, Shield, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import NotificationBell from '@/components/ui/NotificationBell'
import toast from 'react-hot-toast'

const studentLinks = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/practice',          label: 'Practice',  icon: BookOpen },
  { href: '/leaderboard',       label: 'Leaderboard', icon: Trophy },
]
const teacherLinks = [
  { href: '/teacher/dashboard',        label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/teacher/assignments/new',  label: 'New Assignment', icon: BookOpen },
  { href: '/teacher/students',         label: 'Students',    icon: User },
  { href: '/teacher/plagiarism',       label: 'Plagiarism',  icon: Shield },
]

// Navbar handles one focused part of this file's workflow.
export default function Navbar() {
  const { user, logout } = useAuthStore()
  const router   = useRouter()
  const pathname = usePathname()
  const [dropOpen, setDropOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    // h handles one focused part of this file's workflow.
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // handleLogout handles one focused part of this file's workflow.
  const handleLogout = async () => {
    try { await authApi.logout() } catch (_) {}
    logout()
    toast.success('Logged out')
    router.push('/')
  }

  const links = user?.role === 'teacher' ? teacherLinks : studentLinks
  const dashHref = user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'

  return (
    <>
      <nav className="sticky top-0 z-40 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href={dashHref} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-cyan rounded-lg flex items-center justify-center">
              <Code2 className="w-4 h-4 text-navy" />
            </div>
            <span className="font-black text-lg">Auto<span className="text-cyan">Judge</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all
                  ${pathname === l.href
                    ? 'bg-cyan/10 text-cyan'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <l.icon className="w-3.5 h-3.5" />{l.label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-warning hover:bg-warning/10 transition-all">
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            {/* User dropdown */}
            <div className="relative" ref={dropRef}>
              <button onClick={() => setDropOpen(!dropOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                {user?.avatar
                  ? <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                  : <div className="w-7 h-7 bg-gradient-to-br from-cyan to-success rounded-full flex items-center justify-center text-xs font-black text-navy">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>}
                <span className="text-sm hidden md:block max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-navy-2 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10 bg-navy-light/50">
                    <p className="font-semibold text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    <span className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded
                      ${user?.role === 'teacher' ? 'bg-warning/20 text-warning' :
                        user?.role === 'admin'   ? 'bg-danger/20 text-danger' :
                        'bg-cyan/20 text-cyan'}`}>
                      {user?.role}
                    </span>
                  </div>
                  {[
                    { href: '/profile', label: 'My Profile', icon: User },
                    { href: '/settings', label: 'Settings',  icon: Settings },
                  ].map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                      <item.icon className="w-4 h-4" />{item.label}
                    </Link>
                  ))}
                  <div className="border-t border-white/10">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-400 hover:text-white">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-navy-2 px-4 py-3 space-y-1">
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5">
                <l.icon className="w-4 h-4" />{l.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
