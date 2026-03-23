"use client"
// This file drives the AdminPanel feature flow and keeps the behavior easy to reason about.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Code2, BookOpen, BarChart2, Search, Ban, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import Navbar from '@/components/layout/Navbar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const LANG_COLORS = { cpp:'#00B4D8', python:'#FFD43B', java:'#FF5A5F', javascript:'#F7DF1E', c:'#A8B9CC' }
const VERDICT_COLORS = { AC:'#00C896', WA:'#FF5A5F', TLE:'#FF9E00', MLE:'#B388FF', RE:'#FF5A5F', CE:'#90A4AE' }

// AdminPage handles one focused part of this file's workflow.
export default function AdminPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [newProblem, setNewProblem] = useState({ title:'', difficulty:'easy', category:'', problemStatement:'' })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/'); return }
    Promise.all([adminApi.getStats(), adminApi.getUsers()])
      .then(([s, u]) => { setStats(s.data); setUsers(u.data.users) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, router])

  // toggleUser handles one focused part of this file's workflow.
  const toggleUser = async (id) => {
    await adminApi.toggleUser(id)
    setUsers(p => p.map(u => u._id === id ? { ...u, isActive: !u.isActive } : u))
    toast.success('User status updated')
  }

  // addProblem handles one focused part of this file's workflow.
  const addProblem = async () => {
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      await adminApi.createPractice(newProblem)
      toast.success('Practice problem added!')
      setNewProblem({ title:'', difficulty:'easy', category:'', problemStatement:'' })
      setShowForm(false)
    } catch(e) { toast.error('Failed to add problem') }
  }

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  // Quick guard clause so we fail fast before doing heavier work.
  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>

  const langData = stats?.stats?.subsByLang?.map(l => ({ name: l._id?.toUpperCase(), value: l.count })) || []
  const roleData = stats?.stats?.usersByRole?.map(r => ({ name: r._id, value: r.count })) || []

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-danger/20 rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-danger" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Platform management & analytics</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/10 pb-0">
          {['overview','users','practice'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${tab === t ? 'border-cyan text-cyan' : 'border-transparent text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label:'Total Users',       value: stats?.stats?.users || 0,       icon: Users,    color:'text-cyan', bg:'bg-cyan/10' },
                { label:'Total Submissions',  value: stats?.stats?.submissions || 0, icon: Code2,    color:'text-success',      bg:'bg-success/10' },
                { label:'Assignments',        value: stats?.stats?.assignments || 0, icon: BookOpen, color:'text-warning',      bg:'bg-warning/10' },
                { label:'Practice Problems',  value: stats?.stats?.practices || 0,   icon: BarChart2,color:'text-purple',       bg:'bg-purple/10' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.1 }} className="card">
                  <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-black">{s.value.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Language distribution */}
              {langData.length > 0 && (
                <div className="card">
                  <h3 className="font-bold mb-4">Submissions by Language</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={langData} barCategoryGap="35%">
                      <XAxis dataKey="name" tick={{ fill:'#90A4AE', fontSize:11 }} />
                      <YAxis tick={{ fill:'#90A4AE', fontSize:11 }} />
                      <Tooltip contentStyle={{ background:'#1B2B3B', border:'1px solid #00B4D8', borderRadius:'8px', color:'#fff' }} />
                      <Bar dataKey="value" radius={[4,4,0,0]}>
                        {langData.map((e, i) => <Cell key={i} fill={LANG_COLORS[e.name?.toLowerCase()] || '#00B4D8'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* User roles pie */}
              {roleData.length > 0 && (
                <div className="card">
                  <h3 className="font-bold mb-4">Users by Role</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={roleData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {roleData.map((_, i) => <Cell key={i} fill={['#00B4D8','#FF9E00','#FF5A5F'][i % 3]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background:'#1B2B3B', border:'1px solid #00B4D8', borderRadius:'8px', color:'#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent submissions */}
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 bg-navy-2 font-bold">Recent Submissions</div>
              <table className="w-full">
                <thead><tr className="border-b border-white/10 bg-navy-light">
                  {['Student','Assignment','Language','Verdict','Score','Time'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium uppercase px-4 py-2">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(stats?.recentSubmissions || []).map((s, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-navy-2/50 transition-colors">
                      <td className="px-4 py-2.5 text-sm">{s.student?.name || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-400">{s.assignment?.title || 'Practice'}</td>
                      <td className="px-4 py-2.5 text-xs uppercase font-mono text-gray-400">{s.language}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background:(VERDICT_COLORS[s.verdict]||'#90A4AE')+'20', color:VERDICT_COLORS[s.verdict]||'#90A4AE' }}>{s.verdict}</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm">{s.score || 0}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input className="input pl-9" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/10 bg-navy-2">
                  {['User','Email','Role','Points','Status','Action'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium uppercase px-4 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u._id} className="border-b border-white/5 hover:bg-navy-2/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar ? <img src={u.avatar} className="w-7 h-7 rounded-full" /> : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan to-success flex items-center justify-center text-xs font-black text-navy">{u.name?.charAt(0)}</div>}
                          <span className="font-medium text-sm">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${u.role === 'teacher' ? 'bg-warning/20 text-warning' : u.role === 'admin' ? 'bg-danger/20 text-danger' : 'bg-cyan/20 text-cyan'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-cyan">{u.stats?.points || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${u.isActive ? 'text-success' : 'text-danger'}`}>{u.isActive ? '● Active' : '● Banned'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleUser(u._id)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${u.isActive ? 'bg-danger/10 text-danger hover:bg-danger/20' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                          {u.isActive ? <><Ban className="w-3 h-3 inline mr-1" />Ban</> : <><CheckCircle className="w-3 h-3 inline mr-1" />Unban</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* PRACTICE PROBLEMS */}
        {tab === 'practice' && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <div className="flex justify-end mb-6">
              <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Practice Problem
              </button>
            </div>
            {showForm && (
              <div className="card mb-6 border-cyan/30">
                <h3 className="font-bold mb-4">New Practice Problem</h3>
                <div className="space-y-4">
                  <input className="input" placeholder="Title" value={newProblem.title} onChange={e => setNewProblem(p => ({...p, title: e.target.value}))} />
                  <div className="grid grid-cols-2 gap-4">
                    <select className="input" value={newProblem.difficulty} onChange={e => setNewProblem(p => ({...p, difficulty: e.target.value}))}>
                      <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                    </select>
                    <input className="input" placeholder="Category (e.g. Arrays)" value={newProblem.category} onChange={e => setNewProblem(p => ({...p, category: e.target.value}))} />
                  </div>
                  <textarea className="input resize-none" rows={4} placeholder="Problem Statement" value={newProblem.problemStatement} onChange={e => setNewProblem(p => ({...p, problemStatement: e.target.value}))} />
                  <div className="flex gap-3">
                    <button onClick={addProblem} className="btn-primary">Add Problem</button>
                    <button onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
                  </div>
                </div>
              </div>
            )}
            <p className="text-gray-400 text-sm text-center py-10">Practice problems list — add problems above to populate the practice section for all students.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
