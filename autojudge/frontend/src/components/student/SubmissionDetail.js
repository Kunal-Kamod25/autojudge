"use client"
// This file drives the SubmissionDetail feature flow and keeps the behavior easy to reason about.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, AlertCircle, Download, Brain, ArrowLeft, Code2 } from 'lucide-react'
import { submissionApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'

const VERDICT_CONFIG = {
  AC:  { color:'text-success', bg:'bg-success/10', border:'border-success/40', icon: CheckCircle, label:'Accepted' },
  WA:  { color:'text-danger',  bg:'bg-danger/10',  border:'border-danger/40',  icon: XCircle,     label:'Wrong Answer' },
  TLE: { color:'text-warning', bg:'bg-warning/10', border:'border-warning/40', icon: Clock,        label:'Time Limit Exceeded' },
  CE:  { color:'text-purple',  bg:'bg-purple/10',  border:'border-purple/40',  icon: AlertCircle, label:'Compilation Error' },
  RE:  { color:'text-danger',  bg:'bg-danger/10',  border:'border-danger/40',  icon: AlertCircle, label:'Runtime Error' },
  MLE: { color:'text-warning', bg:'bg-warning/10', border:'border-warning/40', icon: AlertCircle, label:'Memory Limit Exceeded' },
}

// SubmissionDetailPage handles one focused part of this file's workflow.
export default function SubmissionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    submissionApi.getSubmission(id).then(r => setSub(r.data.submission)).catch(() => toast.error('Submission not found')).finally(() => setLoading(false))
  }, [id])

  // downloadPDF handles one focused part of this file's workflow.
  const downloadPDF = async () => {
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      const res = await submissionApi.downloadPDF(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `report_${id}.pdf`; a.click()
      toast.success('PDF downloaded!')
    } catch { toast.error('PDF generation failed') }
  }

  // Quick guard clause so we fail fast before doing heavier work.
  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>
  // Quick guard clause so we fail fast before doing heavier work.
  if (!sub) return <div className="min-h-screen bg-navy flex items-center justify-center text-gray-400">Submission not found</div>

  const vc = VERDICT_CONFIG[sub.verdict] || VERDICT_CONFIG.CE
  const passRate = sub.totalTests > 0 ? Math.round((sub.passedTests / sub.totalTests) * 100) : 0

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Verdict Banner */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          className={`${vc.bg} border ${vc.border} rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4`}>
          <div className="flex items-center gap-4">
            <vc.icon className={`w-10 h-10 ${vc.color}`} />
            <div>
              <p className={`text-2xl font-black ${vc.color}`}>{sub.verdict} — {vc.label}</p>
              <p className="text-gray-400">{sub.assignment?.title || 'Practice'} · {sub.language?.toUpperCase()} · {new Date(sub.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-black">{sub.score}<span className="text-gray-500 text-lg">/{sub.totalScore}</span></p>
              <p className="text-xs text-gray-400 uppercase">Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-success">{passRate}%</p>
              <p className="text-xs text-gray-400">{sub.passedTests}/{sub.totalTests} tests</p>
            </div>
            <button onClick={downloadPDF} className="btn-outline text-sm py-2 flex items-center gap-2">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-400">Test Cases Progress</span>
            <span className="font-medium">{sub.passedTests} / {sub.totalTests}</span>
          </div>
          <div className="w-full h-3 bg-navy-light rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${passRate}%` }} transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full" style={{ background: passRate === 100 ? '#00C896' : passRate >= 50 ? '#FF9E00' : '#FF5A5F' }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1"><span>0%</span><span>100%</span></div>
        </div>

        {/* Test Results Grid */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="card mb-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Code2 className="w-4 h-4 text-cyan" /> Test Case Results</h3>
          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
            {sub.testResults?.map((r, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${r.verdict === 'AC' ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'}`}>
                <div className="flex items-center gap-3">
                  {r.verdict === 'AC' ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0" /> : <XCircle className="w-4 h-4 text-danger flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">Test {i+1} <span className="text-xs text-gray-500 capitalize ml-1">({r.type})</span></p>
                    {r.input && <p className="text-xs text-gray-500 font-mono mt-0.5">in: {r.input?.substring(0,40)}{r.input?.length > 40 ? '…' : ''}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs font-bold" style={{ color: VERDICT_CONFIG[r.verdict]?.color?.replace('text-','') || '#fff' }}>{r.verdict}</p>
                    <p className="text-xs text-gray-500">{r.executionTime || 0}ms</p>
                  </div>
                  {r.verdict !== 'AC' && r.actualOutput && (
                    <div className="text-xs text-right">
                      <p className="text-gray-500">expected: <span className="text-success font-mono">{r.expectedOutput?.substring(0,20)}</span></p>
                      <p className="text-gray-500">got: <span className="text-danger font-mono">{r.actualOutput?.substring(0,20)}</span></p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Feedback */}
        {sub.aiFeedback?.summary && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="card border-cyan/30 mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Brain className="w-4 h-4 text-cyan" /> AI Feedback <span className="text-xs text-gray-500 font-normal ml-1">via {sub.aiFeedback.modelUsed}</span></h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">{sub.aiFeedback.summary}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {sub.aiFeedback.bugs?.length > 0 && (
                <div className="bg-danger/5 border border-danger/20 rounded-xl p-4">
                  <p className="text-danger text-xs font-bold uppercase mb-2">🐛 Bugs Found</p>
                  {sub.aiFeedback.bugs.map((b, i) => <p key={i} className="text-sm text-gray-300 mb-1">• {b}</p>)}
                </div>
              )}
              {sub.aiFeedback.improvements?.length > 0 && (
                <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                  <p className="text-success text-xs font-bold uppercase mb-2">✨ Improvements</p>
                  {sub.aiFeedback.improvements.map((imp, i) => <p key={i} className="text-sm text-gray-300 mb-1">• {imp}</p>)}
                </div>
              )}
            </div>
            {(sub.aiFeedback.complexity || sub.aiFeedback.style) && (
              <div className="mt-4 pt-4 border-t border-white/10 grid md:grid-cols-2 gap-3 text-sm text-gray-400">
                {sub.aiFeedback.complexity && <div><span className="text-gray-500 font-medium">Complexity:</span> {sub.aiFeedback.complexity}</div>}
                {sub.aiFeedback.style && <div><span className="text-gray-500 font-medium">Style:</span> {sub.aiFeedback.style}</div>}
              </div>
            )}
          </motion.div>
        )}

        {/* Code Toggle */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }} className="card">
          <button onClick={() => setShowCode(!showCode)} className="w-full flex items-center justify-between font-bold">
            <span className="flex items-center gap-2"><Code2 className="w-4 h-4 text-cyan" /> Submitted Code</span>
            <span className="text-gray-400 text-sm">{showCode ? 'Hide' : 'Show'}</span>
          </button>
          {showCode && sub.code && (
            <pre className="mt-4 bg-navy-light rounded-xl p-4 text-green-400 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
              <code>{sub.code}</code>
            </pre>
          )}
        </motion.div>
      </div>
    </div>
  )
}
