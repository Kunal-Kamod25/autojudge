"use client"
// This file drives the PracticeList feature flow and keeps the behavior easy to reason about.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Search, Filter, Code2 } from 'lucide-react'
import { practiceApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'

// PracticePage handles one focused part of this file's workflow.
export default function PracticePage() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [difficulty, setDifficulty] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    practiceApi.getProblems({ difficulty }).then(r => setProblems(r.data.problems)).catch(() => {}).finally(() => setLoading(false))
  }, [difficulty])

  const filtered = problems.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black mb-2">Practice Problems</h1>
          <p className="text-gray-400">Sharpen your skills with LeetCode-style challenges</p>
        </motion.div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input className="input pl-9" placeholder="Search problems..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-36" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/10 bg-navy-2">
                {['#', 'Title', 'Difficulty', 'Category', 'Acceptance', 'Action'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium uppercase px-4 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-white/5 hover:bg-navy-2/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-sm">{i+1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/practice/${p._id}`} className="font-medium text-sm hover:text-cyan transition-colors">{p.title}</Link>
                      {p.tags?.length > 0 && <div className="flex gap-1 mt-1">{p.tags.slice(0,3).map(t => <span key={t} className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-gray-500">{t}</span>)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${p.difficulty === 'easy' ? 'text-success' : p.difficulty === 'medium' ? 'text-warning' : 'text-danger'}`}>
                        {p.difficulty?.charAt(0).toUpperCase() + p.difficulty?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{p.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{p.acceptanceRate?.toFixed(1) || 0}%</td>
                    <td className="px-4 py-3">
                      <Link href={`/practice/${p._id}`} className="text-cyan text-sm hover:underline flex items-center gap-1">
                        <Code2 className="w-3.5 h-3.5" /> Solve
                      </Link>
                    </td>
                  </motion.tr>
                ))}
                {!filtered.length && <tr><td colSpan={6} className="text-center text-gray-500 py-12 text-sm">No problems found. Check back later!</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
