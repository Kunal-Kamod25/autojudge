"use client"
// This file drives the Settings feature flow and keeps the behavior easy to reason about.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Bell, Palette, Save, Eye, EyeOff, CheckCircle, Phone, Github, Linkedin, FileText } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'

const TABS = [
  { id:'profile',   label:'Profile',       icon: User },
  { id:'password',  label:'Password',      icon: Lock },
  { id:'notifs',    label:'Notifications', icon: Bell },
]

// SettingsPage handles one focused part of this file's workflow.
export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [tab, setTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '', avatar: user?.avatar || '',
    bio: user?.bio || '', phone: user?.phone || '',
    github: user?.github || '', linkedin: user?.linkedin || ''
  })
  const [pwdForm, setPwdForm] = useState({ currentPassword:'', newPassword:'', confirm:'' })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // saveProfile handles one focused part of this file's workflow.
  const saveProfile = async () => {
    setSaving(true)
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      const { data } = await api.put('/api/users/profile', profileForm)
      setUser(data.user)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
      toast.success('Profile updated!')
    } catch(e) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  // savePassword handles one focused part of this file's workflow.
  const savePassword = async () => {
    // Quick guard clause so we fail fast before doing heavier work.
    if (pwdForm.newPassword !== pwdForm.confirm) return toast.error('Passwords do not match')
    // Quick guard clause so we fail fast before doing heavier work.
    if (pwdForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      await api.put('/api/users/password', { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
      setPwdForm({ currentPassword:'', newPassword:'', confirm:'' })
      toast.success('Password changed!')
    } catch(e) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-8">
          <h1 className="text-3xl font-black">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account preferences</p>
        </motion.div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-cyan/10 text-cyan' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                  <t.icon className="w-4 h-4" />{t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <motion.div key={tab} initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.2 }}>

              {tab === 'profile' && (
                <div className="card">
                  <h2 className="font-bold text-lg mb-6">Profile Information</h2>

                  {/* Avatar preview */}
                  <div className="flex items-center gap-4 mb-6">
                    {profileForm.avatar
                      ? <img src={profileForm.avatar} className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan/40" />
                      : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan to-success flex items-center justify-center text-2xl font-black text-navy">
                          {profileForm.name?.charAt(0) || '?'}
                        </div>}
                    <div>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Display Name</label>
                      <input className="input" value={profileForm.name} onChange={e => setProfileForm(p => ({...p, name: e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Avatar URL</label>
                      <input className="input" placeholder="https://example.com/avatar.jpg" value={profileForm.avatar} onChange={e => setProfileForm(p => ({...p, avatar: e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                      <input className="input opacity-60 cursor-not-allowed" value={user?.email || ''} disabled />
                      <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Bio</label>
                      <textarea className="input min-h-[80px] resize-none" maxLength={300} placeholder="Tell us about yourself…"
                        value={profileForm.bio} onChange={e => setProfileForm(p => ({...p, bio: e.target.value}))} />
                      <p className="text-xs text-gray-600 mt-1">{profileForm.bio.length}/300 characters</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</label>
                      <input className="input" placeholder="+1 234 567 8900" maxLength={20}
                        value={profileForm.phone} onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> GitHub</label>
                        <input className="input" placeholder="username" maxLength={100}
                          value={profileForm.github} onChange={e => setProfileForm(p => ({...p, github: e.target.value}))} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</label>
                        <input className="input" placeholder="username" maxLength={100}
                          value={profileForm.linkedin} onChange={e => setProfileForm(p => ({...p, linkedin: e.target.value}))} />
                      </div>
                    </div>
                  </div>

                  <button onClick={saveProfile} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
                    {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}</>}
                  </button>
                </div>
              )}

              {tab === 'password' && (
                <div className="card">
                  <h2 className="font-bold text-lg mb-6">Change Password</h2>
                  {user?.googleId || user?.githubId ? (
                    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-sm text-warning">
                      You signed in via OAuth. Password change is not available for OAuth accounts.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { key:'currentPassword', label:'Current Password' },
                        { key:'newPassword',     label:'New Password' },
                        { key:'confirm',         label:'Confirm New Password' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
                          <div className="relative">
                            <input type={showPwd ? 'text' : 'password'} className="input pr-10"
                              value={pwdForm[key]} onChange={e => setPwdForm(p => ({...p, [key]: e.target.value}))} />
                            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={savePassword} disabled={saving} className="btn-primary flex items-center gap-2">
                        <Lock className="w-4 h-4" />{saving ? 'Updating…' : 'Update Password'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'notifs' && (
                <div className="card">
                  <h2 className="font-bold text-lg mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    {[
                      { label:'Submission graded',    desc:'When your submission is evaluated', default: true },
                      { label:'New assignment posted', desc:'When your teacher posts a new assignment', default: true },
                      { label:'Achievement unlocked',  desc:'When you earn a badge or milestone', default: true },
                      { label:'Plagiarism alert',      desc:'When your submission is flagged', default: true },
                      { label:'System updates',        desc:'Platform announcements and maintenance', default: false },
                    ].map((n, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div>
                          <p className="font-medium text-sm">{n.label}</p>
                          <p className="text-xs text-gray-500">{n.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked={n.default} className="sr-only peer" />
                          <div className="w-10 h-5 bg-navy-light rounded-full peer peer-checked:bg-cyan transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-5" />
                        </label>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => toast.success('Preferences saved!')} className="btn-primary mt-6 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Preferences
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
