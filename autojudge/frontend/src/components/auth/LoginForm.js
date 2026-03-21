"use client"
import { Suspense, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Code2, Eye, EyeOff, Github, Mail, Lock, ArrowRight, X, Send, CheckCircle, Sparkles, Shield, Zap, Users, Trophy, TrendingUp, Terminal, KeyRound, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import api from '@/lib/api'
import { OAUTH_URLS } from '@/config'
import toast from 'react-hot-toast'

const codeLines = [
  { text: 'def dijkstra(graph, src):', color: '#c9d8ea' },
  { text: '    dist = {v: float("inf")', color: '#7a9ab5' },
  { text: '             for v in graph}', color: '#7a9ab5' },
  { text: '    dist[src] = 0', color: '#7a9ab5' },
  { text: '    pq = [(0, src)]', color: '#7a9ab5' },
  { text: '    while pq:', color: '#c9d8ea' },
  { text: '        d, u = heappop(pq)', color: '#7a9ab5' },
  { text: '        for v, w in graph[u]:', color: '#c9d8ea' },
  { text: '            if dist[u]+w < dist[v]:', color: '#7a9ab5' },
  { text: '                dist[v] = dist[u]+w', color: '#00C896' },
  { text: '                heappush(pq,(dist[v],v))', color: '#00C896' },
  { text: '    return dist', color: '#00B4D8' },
]

function LoginPageContent() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState({})
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStep, setForgotStep] = useState(1)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visibleLines, setVisibleLines] = useState(0)
  const [showVerdict, setShowVerdict] = useState(false)
  const [platformStats, setPlatformStats] = useState([{ icon: Users, value: '0', label: 'Coders' }, { icon: TrendingUp, value: '0', label: 'Submissions' }, { icon: Trophy, value: '0', label: 'Problems' }])
  const { login } = useAuthStore()
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const lineInterval = setInterval(() => {
      setVisibleLines(v => {
        if (v < codeLines.length) return v + 1
        clearInterval(lineInterval)
        setTimeout(() => setShowVerdict(true), 400)
        return v
      })
    }, 160)
    return () => clearInterval(lineInterval)
  }, [])

  useEffect(() => {
    api.get('/api/stats').then(({ data }) => {
      if (data.stats) setPlatformStats([
        { icon: Users, value: String(data.stats.students), label: 'Coders' },
        { icon: TrendingUp, value: String(data.stats.submissions), label: 'Submissions' },
        { icon: Trophy, value: String(data.stats.problems), label: 'Problems' },
      ])
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      login(data.user)
      toast.success(`Welcome back, ${data.user.name}! 🎉`)
      router.push(data.user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotEmail) return toast.error('Enter your email address')
    setForgotLoading(true)
    try {
      await authApi.forgotPassword({ email: forgotEmail })
      toast.success('Verification code sent to your email!')
      setForgotStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send code')
    } finally { setForgotLoading(false) }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (otpCode.length !== 6) return toast.error('Enter the 6-digit code')
    setForgotLoading(true)
    try {
      const { data } = await authApi.verifyOTP({ email: forgotEmail, otp: otpCode })
      setResetToken(data.resetToken)
      toast.success('Code verified!')
      setForgotStep(3)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code')
    } finally { setForgotLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match')
    setForgotLoading(true)
    try {
      await authApi.resetPassword({ resetToken, newPassword })
      toast.success('Password reset successfully! You can now log in.')
      closeForgotModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally { setForgotLoading(false) }
  }

  const closeForgotModal = () => {
    setShowForgot(false)
    setForgotStep(1)
    setForgotEmail('')
    setOtpCode('')
    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen auth-split-bg flex overflow-hidden">

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 auth-left-panel overflow-hidden">

        {/* Background effects */}
        <div className="absolute inset-0 auth-left-grid" />
        <motion.div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,180,216,0.12) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,200,150,0.1) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.14, 1] }} transition={{ duration: 7, repeat: Infinity, delay: 1.5, ease: 'easeInOut' }} />

        {/* Branding */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="auth-logo-xl">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="font-black text-3xl tracking-tight">Auto<span className="gradient-text">Judge</span></span>
              <p className="text-xs text-gray-500 font-medium tracking-widest uppercase mt-0.5">Competitive Programming</p>
            </div>
          </Link>
          <p className="text-gray-400 mt-5 text-sm leading-7 max-w-sm">
            The <span className="text-cyan-400 font-semibold">AI-powered</span> platform where students compete, learn, and get instant feedback on their code.
          </p>
        </motion.div>

        {/* Animated Code Editor */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
          className="relative z-10 auth-code-editor">

          {/* Editor titlebar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            <div className="ml-3 flex items-center gap-1.5 bg-white/[0.04] rounded-md px-3 py-1">
              <Terminal className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-400 font-mono">dijkstra.py</span>
            </div>
            <span className="ml-auto text-xs text-gray-600 font-mono bg-cyan-400/10 text-cyan-500 px-2 py-0.5 rounded">Python 3.11</span>
          </div>

          {/* Line numbers + code */}
          <div className="p-5 font-mono text-xs leading-[1.7] min-h-[230px]">
            <AnimatePresence>
              {codeLines.slice(0, visibleLines).map((line, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-3">
                  <span className="text-gray-700 select-none w-4 text-right shrink-0">{i + 1}</span>
                  <span style={{ color: line.color }} className="whitespace-pre">{line.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleLines < codeLines.length && (
              <div className="flex gap-3">
                <span className="text-gray-700 w-4 text-right">{visibleLines + 1}</span>
                <span className="auth-cursor" />
              </div>
            )}
          </div>

          {/* Verdict */}
          <AnimatePresence>
            {showVerdict && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300 }}
                className="auth-verdict-accepted mx-5 mb-5">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-green-400 font-bold text-sm">Accepted</p>
                  <p className="text-gray-500 text-xs">47/47 test cases · 12 ms · beats 99.2%</p>
                </div>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                  className="text-sm font-black text-cyan-400">+150 XP</motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="relative z-10 grid grid-cols-3 gap-3">
          {platformStats.map(({ icon: Icon, value, label }, i) => (
            <motion.div key={i} whileHover={{ y: -4 }} className="auth-stat-card">
              <Icon className="w-4 h-4 text-cyan-400 mb-2 mx-auto" />
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div className="w-full lg:w-[48%] flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div className="absolute inset-0 lg:hidden auth-right-mobile-bg" />
        <div className="absolute inset-0 auth-left-grid opacity-[0.07]" />
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: [0.22,1,0.36,1] }}
          className="w-full max-w-[440px] relative z-10">

          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="auth-logo"><Code2 className="w-5 h-5 text-white" /></div>
              <span className="font-black text-2xl">Auto<span className="gradient-text">Judge</span></span>
            </Link>
          </div>

          <div className="auth-glass-card">

          <div className="mb-7">
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-3xl font-black tracking-tight mb-2 leading-tight">
              Welcome <span className="gradient-text">back</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className="text-gray-500 text-sm">Sign in to continue your journey</motion.p>
          </div>

          {params.get('error') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-error-banner mb-5">
              <X className="w-4 h-4 shrink-0" /> OAuth sign-in failed. Please try again.
            </motion.div>
          )}

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              href={OAUTH_URLS.google} className="auth-oauth-btn-v2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </motion.a>
            <motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              href={OAUTH_URLS.github} className="auth-oauth-btn-v2">
              <Github className="w-4 h-4" /> GitHub
            </motion.a>
          </div>

          <div className="auth-divider mb-5"><span>or continue with email</span></div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="auth-label mb-2 block">Email address</label>
              <div className="relative">
                <Mail className={`auth-field-icon transition-colors ${focused.email ? 'text-cyan-400' : 'text-gray-600'}`} />
                <input type="email" required value={form.email}
                  className={`auth-input-v2 pl-10 ${focused.email ? 'focused' : ''}`}
                  placeholder="you@example.com"
                  onFocus={() => setFocused(p => ({ ...p, email: true }))}
                  onBlur={() => setFocused(p => ({ ...p, email: false }))}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="auth-label">Password</label>
                <button type="button" onClick={() => setShowForgot(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className={`auth-field-icon transition-colors ${focused.password ? 'text-cyan-400' : 'text-gray-600'}`} />
                <input type={showPwd ? 'text' : 'password'} required value={form.password}
                  className={`auth-input-v2 pl-10 pr-10 ${focused.password ? 'focused' : ''}`}
                  placeholder="••••••••"
                  onFocus={() => setFocused(p => ({ ...p, password: true }))}
                  onBlur={() => setFocused(p => ({ ...p, password: false }))}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="auth-submit-btn-v2 w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">Sign in <ArrowRight className="w-4 h-4" /></span>
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
              Create one free →
            </Link>
          </p>

          </div>{/* end auth-glass-card */}

          <div className="flex justify-center gap-5 mt-6">
            {[['🔒', 'SSL Encrypted'], ['⚡', 'Instant Access'], ['✨', 'AI-Powered']].map(([icon, label], i) => (
              <span key={i} className="text-xs text-gray-700 flex items-center gap-1 font-medium">{icon} {label}</span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ───────────────────────────── */}
      <AnimatePresence>
        {showForgot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4"
            onClick={(e) => e.target === e.currentTarget && closeForgotModal()}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="auth-modal w-full max-w-sm">

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">
                    {forgotStep === 1 ? 'Reset Password' : forgotStep === 2 ? 'Verify Code' : 'New Password'}
                  </h2>
                  <p className="text-gray-500 text-xs mt-1">
                    {forgotStep === 1 ? 'We\'ll send a verification code' : forgotStep === 2 ? `Code sent to ${forgotEmail}` : 'Choose a new password'}
                  </p>
                </div>
                <button onClick={closeForgotModal}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= forgotStep ? 'bg-cyan' : 'bg-white/10'
                  }`} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1: Enter email */}
                {forgotStep === 1 && (
                  <motion.form key="step1" onSubmit={handleForgotPassword}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="space-y-4">
                    <div className="relative">
                      <Mail className="auth-field-icon text-gray-600" />
                      <input type="email" required value={forgotEmail} placeholder="your@email.com"
                        className="auth-input-v2 pl-10"
                        onChange={e => setForgotEmail(e.target.value)} />
                    </div>
                    <motion.button type="submit" disabled={forgotLoading}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      className="auth-submit-btn-v2 w-full">
                      {forgotLoading ? 'Sending...' : (
                        <span className="flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Send Verification Code</span>
                      )}
                    </motion.button>
                  </motion.form>
                )}

                {/* Step 2: Enter OTP */}
                {forgotStep === 2 && (
                  <motion.form key="step2" onSubmit={handleVerifyOTP}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="space-y-4">
                    <div className="relative">
                      <KeyRound className="auth-field-icon text-gray-600" />
                      <input type="text" required value={otpCode} placeholder="Enter 6-digit code"
                        maxLength={6} pattern="[0-9]{6}"
                        className="auth-input-v2 pl-10 tracking-[0.3em] text-center font-mono text-lg"
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                    </div>
                    <motion.button type="submit" disabled={forgotLoading || otpCode.length !== 6}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      className="auth-submit-btn-v2 w-full">
                      {forgotLoading ? 'Verifying...' : 'Verify Code'}
                    </motion.button>
                    <button type="button" onClick={handleForgotPassword}
                      className="w-full text-center text-sm text-gray-500 hover:text-cyan transition-colors flex items-center justify-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Resend code
                    </button>
                  </motion.form>
                )}

                {/* Step 3: New password */}
                {forgotStep === 3 && (
                  <motion.form key="step3" onSubmit={handleResetPassword}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="space-y-4">
                    <div className="relative">
                      <Lock className="auth-field-icon text-gray-600" />
                      <input type="password" required value={newPassword} placeholder="New password"
                        minLength={6} className="auth-input-v2 pl-10"
                        onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className="relative">
                      <Lock className="auth-field-icon text-gray-600" />
                      <input type="password" required value={confirmPassword} placeholder="Confirm password"
                        minLength={6} className="auth-input-v2 pl-10"
                        onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    <motion.button type="submit" disabled={forgotLoading}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      className="auth-submit-btn-v2 w-full">
                      {forgotLoading ? 'Resetting...' : (
                        <span className="flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Reset Password</span>
                      )}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen auth-split-bg" />}>
      <LoginPageContent />
    </Suspense>
  )
}
