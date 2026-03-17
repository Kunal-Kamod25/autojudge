"use client"
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, Users, BookOpen, AlertTriangle, BarChart2, Brain, Eye, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { reportApi, assignmentApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

const VERDICT_COLORS = { AC: '#00C896', WA: '#FF5A5F', TLE: '#FF9E00', MLE: '#B388FF', RE: '#FF5A5F', CE: '#90A4AE' }

export default function TeacherDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    Promise.all([reportApi.teacherDashboard(), assignmentApi.getAll()])
      .then(([r, a]) => { setStats(r.data.stats); setAssignments(a.data.assignments) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const deleteAssignment = async (id) => {
    if (!confirm('Delete this assignment?')) return
    await assignmentApi.delete(id)
    toast.success('Deleted')
    setAssignments(p => p.filter(a => a._id !== id))
  }

  const publishToggle = async (a) => {
    await assignmentApi.update(a._id, { isPublished: !a.isPublished })
    setAssignments(p => p.map(x => x._id === a._id ? { ...x, isPublished: !x.isPublished } : x))
    toast.success(a.isPublished ? 'Unpublished' : 'Published!')
  }

  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>

  const chartData = stats?.verdicts?.map(v => ({ name: v._id, count: v.count })) || []

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Teacher Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back, {user?.name}</p>
          </div>
          <Link href="/teacher/assignments/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Assignment
          </Link>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Assignments', value: stats?.totalAssignments || 0, icon: BookOpen, color: 'text-cyan', bg: 'bg-cyan/10' },
            { label: 'Total Submissions', value: stats?.totalSubmissions || 0, icon: BarChart2, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Plagiarism Alerts', value: stats?.plagiarismAlerts || 0, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Active Students', value: assignments.length * 5, icon: Users, color: 'text-purple', bg: 'bg-purple/10' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Verdict Distribution */}
          {chartData.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card">
              <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-cyan" /> Submission Verdicts</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill: '#90A4AE', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#90A4AE', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1B2B3B', border: '1px solid #00B4D8', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {chartData.map((entry, i) => <Cell key={i} fill={VERDICT_COLORS[entry.name] || '#90A4AE'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Brain className="w-4 h-4 text-cyan" /> Quick Actions</h3>
            <div className="space-y-3">
              {[
                { href: '/teacher/assignments/new', label: 'Create New Assignment', icon: Plus, color: 'text-success' },
                { href: '/teacher/students', label: 'View All Students', icon: Users, color: 'text-cyan' },
                { href: '/teacher/plagiarism', label: 'Plagiarism Reports', icon: AlertTriangle, color: 'text-warning' },
              ].map((a, i) => (
                <Link key={i} href={a.href} className="flex items-center gap-3 p-3 bg-navy-light rounded-lg hover:bg-navy-2 transition-colors group">
                  <a.icon className={`w-4 h-4 ${a.color}`} />
                  <span className="text-sm group-hover:text-white text-gray-300">{a.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Assignments Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="font-bold text-lg mb-4">My Assignments</h3>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/10 bg-navy-2">
                {['Title', 'Difficulty', 'Languages', 'Tests', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium uppercase px-4 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={a._id} className="border-b border-white/5 hover:bg-navy-2/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-sm">{a.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.difficulty === 'easy' ? 'bg-success/20 text-success' : a.difficulty === 'medium' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                        {a.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{a.languages?.join(', ')}</td>
                    <td className="px-4 py-3 text-sm text-cyan">{a.testCases?.length || 0}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => publishToggle(a)}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${a.isPublished ? 'bg-success/20 text-success hover:bg-success/30' : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'}`}>
                        {a.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/teacher/assignments/${a._id}/edit`} className="text-gray-400 hover:text-cyan"><Eye className="w-4 h-4" /></Link>
                        <button onClick={() => deleteAssignment(a._id)} className="text-gray-400 hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!assignments.length && <tr><td colSpan={6} className="text-center text-gray-500 py-8 text-sm">No assignments yet. Create your first one!</td></tr>}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
