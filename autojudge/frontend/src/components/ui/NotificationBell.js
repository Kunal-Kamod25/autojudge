"use client"
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { notificationApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '@/config'
import Link from 'next/link'
import toast from 'react-hot-toast'

const TYPE_ICONS = {
  submission: '⚡', grade: '📊', plagiarism: '⚠️',
  achievement: '🏆', assignment: '📚', system: '🔔'
}

export default function NotificationBell() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await notificationApi.getAll({ limit: 15 })
      setNotifications(data.notifications)
      setUnread(data.unreadCount)
    } catch(e) {} finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    // Socket real-time
    const socket = io(SOCKET_URL, { withCredentials: true })
    if (user?._id) socket.emit('join-room', user._id)
    socket.on('notification', (n) => {
      setNotifications(p => [n, ...p].slice(0, 15))
      setUnread(p => p + 1)
      toast.custom(() => (
        <div className="glass border border-cyan/30 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
          <span>{TYPE_ICONS[n.type]}</span>
          <div><div className="font-medium">{n.title}</div><div className="text-gray-400 text-xs">{n.message}</div></div>
        </div>
      ))
    })
    // Close on outside click
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => { socket.disconnect(); document.removeEventListener('mousedown', handler) }
  }, [user?._id])

  const markRead = async (id) => {
    await notificationApi.markRead(id)
    setNotifications(p => p.map(n => n._id === id ? { ...n, isRead: true } : n))
    setUnread(p => Math.max(0, p - 1))
  }

  const markAllRead = async () => {
    await notificationApi.markAllRead()
    setNotifications(p => p.map(n => ({ ...n, isRead: true })))
    setUnread(0)
  }

  const deleteNotif = async (id, e) => {
    e.stopPropagation()
    await notificationApi.delete(id)
    setNotifications(p => p.filter(n => n._id !== id))
  }

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins/60)}h ago`
    return `${Math.floor(mins/1440)}d ago`
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-xs font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-navy-2 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-bold text-sm">Notifications</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-cyan hover:underline flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-cyan border-t-transparent rounded-full" /></div>
              ) : notifications.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-10">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : notifications.map((n) => (
                <motion.div key={n._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => { if (!n.isRead) markRead(n._id); if (n.link) window.location.href = n.link }}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 group ${!n.isRead ? 'bg-cyan/5' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-navy-light flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <button onClick={(e) => deleteNotif(n._id, e)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-danger flex-shrink-0 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-600 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-cyan flex-shrink-0 mt-2" />}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
