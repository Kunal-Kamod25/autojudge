"use client"
// This file drives the StudentsList feature flow and keeps the behavior easy to reason about.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Users, Search, TrendingUp, Code2, Trophy } from 'lucide-react'
import api from '@/lib/api'
import Navbar from '@/components/layout/Navbar'

// TeacherStudentsPage handles one focused part of this file's workflow.
export default function TeacherStudentsPage() {
  const [students, setStudents] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('points')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/users/students').then(r => { setStudents(r.data.students); setFiltered(r.data.students) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    let list = students.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    list = [...list].sort((a, b) => (b.stats?.[sortBy] || 0) - (a.stats?.[sortBy] || 0))
    setFiltered(list)
  }, [search, sortBy, students])

  // Quick guard clause so we fail fast before doing heavier work.
  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>

  // avg handles one focused part of this file's workflow.
  const avg = (field) => students.length ? Math.round(students.reduce((s, u) => s + (u.stats?.[field] || 0), 0) / students.length) : 0

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-8">
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3"><Users className="w-8 h-8 text-cyan" /> Students</h1>
          <p className="text-gray-400">{students.length} students enrolled</p>
        </motion.div>

        {/* Class stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Avg. Solved',      value: avg('solved'),           icon: Code2,      color: 'text-cyan' },
            { label: 'Avg. Submissions', value: avg('totalSubmissions'), icon: TrendingUp,  color: 'text-success' },
            { label: 'Avg. Points',      value: avg('points'),           icon: Trophy,      color: 'text-warning' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.1 }} className="card">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input className="input pl-9" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-44" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="points">Sort: Points</option>
            <option value="solved">Sort: Solved</option>
            <option value="totalSubmissions">Sort: Submissions</option>
          </select>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-white/10 bg-navy-2">
              {['Student','Email','Solved','Submissions','Points','Last Active',''].map(h => (
                <th key={h} className="text-left text-xs text-gray-400 font-medium uppercase px-4 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((s, i) => (
                <motion.tr key={s._id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.02 }}
                  className="border-b border-white/5 hover:bg-navy-2/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-success flex items-center justify-center text-xs font-black text-navy">
                        {s.name?.charAt(0)}
                      </div>
                      <span className="font-medium text-sm">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{s.email}</td>
                  <td className="px-4 py-3 text-success font-medium">{s.stats?.solved || 0}</td>
                  <td className="px-4 py-3 text-gray-300">{s.stats?.totalSubmissions || 0}</td>
                  <td className="px-4 py-3 text-cyan font-bold">{s.stats?.points || 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.lastLogin ? new Date(s.lastLogin).toLocaleDateString() : 'Never'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/profile/${s._id}`} className="text-xs text-cyan hover:underline">Profile</Link>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10 text-sm">No students found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
