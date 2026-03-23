"use client"
// This file drives the PlagiarismChecker feature flow and keeps the behavior easy to reason about.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Search, Shield, Eye } from 'lucide-react'
import api from '@/lib/api'
import { assignmentApi, submissionApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

// PlagiarismPage handles one focused part of this file's workflow.
export default function PlagiarismPage() {
  const [flagged, setFlagged] = useState([])
  const [assignments, setAssignments] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    assignmentApi.getAll().then(r => setAssignments(r.data.assignments)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = selected ? `?assignmentId=${selected}&plagiarism=true` : '?plagiarism=true'
    api.get(`/api/reports/plagiarism${params}`)
      .then(r => setFlagged(r.data.submissions || []))
      .catch(() => setFlagged([]))
      .finally(() => setLoading(false))
  }, [selected])

  // getSeverity handles one focused part of this file's workflow.
  const getSeverity = (score) => score >= 90 ? { label:'Critical', color:'text-danger', bg:'bg-danger/20' } : score >= 75 ? { label:'High', color:'text-warning', bg:'bg-warning/20' } : { label:'Medium', color:'text-yellow-400', bg:'bg-yellow-400/20' }

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-warning" />
            </div>
            <h1 className="text-3xl font-black">Plagiarism Reports</h1>
          </div>
          <p className="text-gray-400">Submissions flagged for code similarity above 70%</p>
        </motion.div>

        <div className="flex gap-3 mb-6">
          <select className="input w-56" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">All Assignments</option>
            {assignments.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-warning border-t-transparent rounded-full" /></div>
        ) : flagged.length === 0 ? (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card text-center py-16">
            <Shield className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="font-bold text-lg mb-1">No Plagiarism Detected</p>
            <p className="text-gray-400 text-sm">All submissions appear to be original work</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {flagged.map((sub, i) => {
              const sev = getSeverity(sub.plagiarismScore)
              return (
                <motion.div key={sub._id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}
                  className="card border-warning/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-bold">{sub.student?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-400">{sub.assignment?.title || 'Practice'} · {sub.language?.toUpperCase()} · {new Date(sub.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-navy-light rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${sub.plagiarismScore}%` }} />
                          </div>
                          <span className="font-black text-warning">{sub.plagiarismScore}%</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block ${sev.bg} ${sev.color}`}>{sev.label}</span>
                      </div>
                      <Link href={`/student/submissions/${sub._id}`} className="btn-outline text-sm py-2 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </div>
                  </div>
                  {sub.plagiarismDetails && <p className="text-xs text-gray-500 mt-3 border-t border-white/5 pt-3">{sub.plagiarismDetails}</p>}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
