"use client"
// This file drives the Leaderboard feature flow and keeps the behavior easy to reason about.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Star, Flame, Code2, TrendingUp } from 'lucide-react'
import { leaderboardApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

const RANK_STYLES = [
  'bg-gradient-to-r from-yellow-500/20 to-warning/20 border-warning/40',
  'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/40',
  'bg-gradient-to-r from-amber-700/20 to-amber-600/20 border-amber-600/40',
]
const RANK_TEXT = ['text-warning', 'text-gray-300', 'text-amber-500']

// LeaderboardPage handles one focused part of this file's workflow.
export default function LeaderboardPage() {
  const { user } = useAuthStore()
  const [board, setBoard] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([leaderboardApi.getAll({ limit: 50 }), leaderboardApi.getMyRank()])
      .then(([lb, me]) => { setBoard(lb.data.leaderboard); setMyRank(me.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Quick guard clause so we fail fast before doing heavier work.
  if (loading) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" />
    </div>
  )

  const top3 = board.slice(0, 3)
  const rest = board.slice(3)

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-full px-4 py-1.5 mb-4 text-sm text-warning">
            <Trophy className="w-4 h-4" /> Global Rankings
          </div>
          <h1 className="text-4xl font-black mb-2">Leaderboard</h1>
          <p className="text-gray-400">Compete with students worldwide. Earn points by solving problems.</p>
        </motion.div>

        {/* My Rank Banner */}
        {myRank && (
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            className="glass border border-cyan/30 rounded-2xl p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-cyan" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Your Ranking</p>
                <p className="text-2xl font-black">#{myRank.rank} <span className="text-base font-normal text-gray-400">of {myRank.total}</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Top</p>
              <p className="text-2xl font-black text-cyan">{100 - myRank.percentile}%</p>
            </div>
          </motion.div>
        )}

        {/* Podium — Top 3 */}
        {top3.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-10">
            {/* 2nd */}
            <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
              className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-400/20 rounded-full flex items-center justify-center text-2xl mb-2 border-2 border-gray-400/40">
                {top3[1]?.avatar ? <img src={top3[1].avatar} className="w-full h-full rounded-full object-cover" /> : top3[1]?.name?.charAt(0)}
              </div>
              <p className="font-bold text-sm text-center truncate w-20">{top3[1]?.name?.split(' ')[0]}</p>
              <p className="text-xs text-gray-400">{top3[1]?.stats?.points || 0} pts</p>
              <div className="w-24 h-16 bg-gray-500/20 border border-gray-500/30 rounded-t-lg flex items-center justify-center mt-2">
                <Medal className="w-6 h-6 text-gray-400" />
              </div>
            </motion.div>
            {/* 1st */}
            <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} className="flex flex-col items-center">
              <div className="w-20 h-20 bg-warning/20 rounded-full flex items-center justify-center text-3xl mb-2 border-2 border-warning/60 shadow-[0_0_20px_rgba(255,158,0,0.3)]">
                {top3[0]?.avatar ? <img src={top3[0].avatar} className="w-full h-full rounded-full object-cover" /> : top3[0]?.name?.charAt(0)}
              </div>
              <div className="flex items-center gap-1 mb-1"><Trophy className="w-4 h-4 text-warning" /><span className="font-black text-warning text-sm">#1</span></div>
              <p className="font-bold text-sm text-center truncate w-24">{top3[0]?.name?.split(' ')[0]}</p>
              <p className="text-xs text-warning">{top3[0]?.stats?.points || 0} pts</p>
              <div className="w-24 h-24 bg-warning/20 border border-warning/40 rounded-t-lg flex items-center justify-center mt-2">
                <Star className="w-8 h-8 text-warning" />
              </div>
            </motion.div>
            {/* 3rd */}
            <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
              className="flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-700/20 rounded-full flex items-center justify-center text-2xl mb-2 border-2 border-amber-600/40">
                {top3[2]?.avatar ? <img src={top3[2].avatar} className="w-full h-full rounded-full object-cover" /> : top3[2]?.name?.charAt(0)}
              </div>
              <p className="font-bold text-sm text-center truncate w-20">{top3[2]?.name?.split(' ')[0]}</p>
              <p className="text-xs text-gray-400">{top3[2]?.stats?.points || 0} pts</p>
              <div className="w-24 h-12 bg-amber-700/20 border border-amber-600/30 rounded-t-lg flex items-center justify-center mt-2">
                <Medal className="w-5 h-5 text-amber-500" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Full table */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }} className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-navy-2">
                {['Rank','User','Solved','Submissions','Points','Streak'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium uppercase px-4 py-3 first:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.map((u, i) => {
                const isMe = u._id === user?._id || u.name === user?.name
                return (
                  <motion.tr key={u._id || i}
                    initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.02 }}
                    className={`border-b border-white/5 transition-colors ${isMe ? 'bg-cyan/5 border-cyan/20' : 'hover:bg-navy-2/50'}
                      ${i < 3 ? RANK_STYLES[i] : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-black text-lg ${i < 3 ? RANK_TEXT[i] : 'text-gray-500'}`}>
                        {u.badge || `#${u.rank}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/profile/${u._id}`} className="flex items-center gap-3 hover:text-cyan transition-colors">
                        {u.avatar
                          ? <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" />
                          : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-success flex items-center justify-center text-xs font-black text-navy">
                              {u.name?.charAt(0)}
                            </div>}
                        <span className="font-medium text-sm">{u.name}{isMe && <span className="ml-2 text-xs text-cyan">(you)</span>}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-success font-medium">{u.stats?.solved || 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{u.stats?.totalSubmissions || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`font-black ${i === 0 ? 'text-warning' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-500' : 'text-cyan'}`}>
                        {u.stats?.points || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Flame className="w-3.5 h-3.5 text-warning" />
                        <span>{u.stats?.streak || 0}d</span>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
              {board.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-500 py-12 text-sm">No rankings yet. Be the first to solve problems!</td></tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  )
}
