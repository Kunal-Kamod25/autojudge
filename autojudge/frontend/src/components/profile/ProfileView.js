"use client"
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import { Code2, Trophy, Flame, Target, CheckCircle, Calendar, Star, Github, Mail } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import Navbar from '@/components/layout/Navbar'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'

const VERDICT_COLORS = { AC:'#00C896', WA:'#FF5A5F', TLE:'#FF9E00', MLE:'#B388FF', RE:'#FF5A5F', CE:'#90A4AE' }

export default function ProfilePage() {
  const { id } = useParams()
  const { user: me } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const isOwnProfile = me?._id === id || me?.id === id

  useEffect(() => {
    api.get(`/api/users/profile/${id}`)
      .then(r => { setProfile(r.data.user); setSubs(r.data.recentSubmissions || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" />
  </div>

  if (!profile) return <div className="min-h-screen bg-navy flex items-center justify-center text-gray-400">User not found</div>

  const radarData = [
    { subject: 'Solved', A: profile.stats?.solved || 0, full: 100 },
    { subject: 'Points', A: Math.min(profile.stats?.points || 0, 1000), full: 1000 },
    { subject: 'Streak', A: profile.stats?.streak || 0, full: 30 },
    { subject: 'Submissions', A: Math.min(profile.stats?.totalSubmissions || 0, 500), full: 500 },
  ]

  const verdictBreakdown = Object.entries(
    subs.reduce((acc, s) => { acc[s.verdict] = (acc[s.verdict] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Profile Header */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          className="glass border border-white/10 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative">
            {profile.avatar
              ? <img src={profile.avatar} className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan/40" />
              : <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan to-success flex items-center justify-center text-4xl font-black text-navy border-2 border-cyan/40">
                  {profile.name?.charAt(0)}
                </div>}
            <div className="absolute -bottom-2 -right-2 bg-navy-2 border border-white/20 rounded-lg px-2 py-0.5 text-xs font-bold capitalize text-cyan">
              {profile.role}
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-black mb-1">{profile.name}</h1>
            <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2 mb-3">
              <Mail className="w-4 h-4" />{profile.email}
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {profile.googleId && <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-gray-400">Google</span>}
              {profile.githubId && <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-gray-400 flex items-center gap-1"><Github className="w-3 h-3" /> GitHub</span>}
              <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          {isOwnProfile && (
            <Link href="/settings" className="btn-outline text-sm py-2 flex-shrink-0">Edit Profile</Link>
          )}
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Problems Solved', value: profile.stats?.solved || 0, icon: CheckCircle, color: 'text-success' },
            { label: 'Total Points',    value: profile.stats?.points || 0, icon: Trophy, color: 'text-warning' },
            { label: 'Day Streak',      value: `${profile.stats?.streak || 0}🔥`, icon: Flame, color: 'text-warning' },
            { label: 'Submissions',     value: profile.stats?.totalSubmissions || 0, icon: Code2, color: 'text-cyan' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.1 }}
              className="card text-center">
              <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
              <p className="text-xl font-black">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Radar chart */}
          <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }} className="card">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-warning" /> Performance</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#90A4AE', fontSize: 11 }} />
                <Radar dataKey="A" stroke="#00B4D8" fill="#00B4D8" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Verdict pie */}
          <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }} className="card">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-cyan" /> Submission Verdicts</h3>
            {verdictBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={verdictBreakdown} cx="50%" cy="50%" outerRadius={60} dataKey="value" paddingAngle={3}>
                      {verdictBreakdown.map((e, i) => <Cell key={i} fill={VERDICT_COLORS[e.name] || '#90A4AE'} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {verdictBreakdown.map(v => (
                    <div key={v.name} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: VERDICT_COLORS[v.name] || '#90A4AE' }} />
                      <span className="text-gray-400">{v.name}: {v.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-gray-500 text-sm text-center py-8">No submissions yet</p>}
          </motion.div>
        </div>

        {/* Recent submissions */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} className="card mt-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Code2 className="w-4 h-4 text-cyan" /> Recent Submissions</h3>
          {subs.length > 0 ? (
            <div className="space-y-2">
              {subs.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-navy-light rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`badge-${s.verdict?.toLowerCase() || 'ce'} font-mono text-xs font-bold px-2 py-0.5 rounded`}
                      style={{ background: (VERDICT_COLORS[s.verdict] || '#90A4AE') + '20', color: VERDICT_COLORS[s.verdict] || '#90A4AE' }}>
                      {s.verdict}
                    </span>
                    <span className="text-gray-300 uppercase text-xs">{s.language}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm text-center py-6">No recent submissions</p>}
        </motion.div>
      </div>
    </div>
  )
}
