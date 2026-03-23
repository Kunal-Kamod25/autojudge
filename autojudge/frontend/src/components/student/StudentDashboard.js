"use client"
// This file drives the StudentDashboard feature flow and keeps the behavior easy to reason about.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Code2, Trophy, Flame, Target, BookOpen, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { reportApi, assignmentApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const VERDICT_COLORS = { AC: '#00C896', WA: '#FF5A5F', TLE: '#FF9E00', MLE: '#B388FF', RE: '#FF5A5F', CE: '#90A4AE' }

// StudentDashboard handles one focused part of this file's workflow.
export default function StudentDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([reportApi.studentDashboard(), assignmentApi.getAll()])
      .then(([r, a]) => { setData(r.data); setAssignments(a.data.assignments) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const verdictData = data?.verdictStats?.map(v => ({ name: v._id, value: v.count })) || []

  // Quick guard clause so we fail fast before doing heavier work.
  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black">Hey, <span className="gradient-text">{user?.name?.split(' ')[0]} 👋</span></h1>
          <p className="text-gray-400 mt-1">Ready to code today?</p>
          <div className="mt-4">
            <Link href="/student/run" className="btn-primary text-sm py-2 inline-flex items-center gap-2">
              <Code2 className="w-4 h-4" /> Run My Code
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Submissions', value: user?.stats?.totalSubmissions || 0, icon: Code2, color: 'text-cyan', bg: 'bg-cyan/10' },
            { label: 'Problems Solved', value: user?.stats?.solved || 0, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Current Streak', value: `${user?.stats?.streak || 0} days`, icon: Flame, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Total Points', value: user?.stats?.points || 0, icon: Trophy, color: 'text-purple', bg: 'bg-purple/10' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="card">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Verdict Chart */}
          {verdictData.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-cyan" /> My Verdicts</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={verdictData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {verdictData.map((entry, i) => <Cell key={i} fill={VERDICT_COLORS[entry.name] || '#90A4AE'} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#1B2B3B', border: '1px solid #00B4D8', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {verdictData.map(v => (
                  <div key={v.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: VERDICT_COLORS[v.name] }}></div>
                    <span className="text-gray-400">{v.name}: {v.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent Submissions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-cyan" /> Recent Submissions</h3>
              <Link href="/student/submissions" className="text-xs text-cyan hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {(data?.recentSubmissions || []).slice(0, 6).map((s, i) => (
                <Link key={i} href={`/student/submissions/${s._id}`} className="flex items-center justify-between p-3 bg-navy-light rounded-lg hover:bg-navy-2 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className={`badge-${s.verdict?.toLowerCase() || 'ce'} font-mono`}>{s.verdict || 'N/A'}</span>
                    <span className="text-sm text-gray-300 group-hover:text-white truncate max-w-[150px]">{s.assignment?.title || 'Practice'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="uppercase">{s.language}</span>
                    <span>{s.score || 0}pts</span>
                  </div>
                </Link>
              ))}
              {(!data?.recentSubmissions?.length) && <p className="text-gray-500 text-sm text-center py-4">No submissions yet. Start coding!</p>}
            </div>
          </motion.div>
        </div>

        {/* Assignments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-cyan" /> Active Assignments</h3>
            <Link href="/practice" className="btn-outline text-sm py-2">Browse Practice</Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.slice(0, 6).map((a, i) => (
              <motion.div key={a._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="card glow-hover group">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.difficulty === 'easy' ? 'bg-success/20 text-success' : a.difficulty === 'medium' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                    {a.difficulty?.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="font-semibold mb-1 group-hover:text-cyan transition-colors">{a.title}</h4>
                <p className="text-gray-400 text-xs mb-4 line-clamp-2">{a.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {a.languages?.map(l => <span key={l} className="text-xs bg-white/5 px-2 py-0.5 rounded text-gray-400">{l}</span>)}
                  </div>
                  <Link href={`/student/assignments/${a._id}`} className="text-cyan text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Solve <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
