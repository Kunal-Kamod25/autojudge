"use client"
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import Editor from '@monaco-editor/react'
import { useDropzone } from 'react-dropzone'
import { Play, Upload, FileCode, Download, FolderOpen, X, CheckCircle, XCircle, Clock, AlertCircle, Brain } from 'lucide-react'
import { assignmentApi, submissionApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/lib/store'
import { SOCKET_URL } from '@/config'

const LANG_TEMPLATES = {
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
  python: '# Your solution here\ndef solve():\n    pass\n\nsolve()',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}',
  javascript: '// Your solution\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on("line", (line) => {\n    // Process input\n});',
  c: '#include <stdio.h>\n\nint main() {\n    // Your code\n    return 0;\n}'
}

const VERDICT_CONFIG = {
  AC: { color: 'text-success', bg: 'bg-success/10', border: 'border-success', icon: CheckCircle, label: 'Accepted' },
  WA: { color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger', icon: XCircle, label: 'Wrong Answer' },
  TLE: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning', icon: Clock, label: 'Time Limit Exceeded' },
  CE: { color: 'text-purple', bg: 'bg-purple/10', border: 'border-purple', icon: AlertCircle, label: 'Compilation Error' },
  RE: { color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger', icon: AlertCircle, label: 'Runtime Error' },
  MLE: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning', icon: AlertCircle, label: 'Memory Limit' },
}

export default function AssignmentPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [assignment, setAssignment] = useState(null)
  const [language, setLanguage] = useState('cpp')
  const [code, setCode] = useState(LANG_TEMPLATES.cpp)
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [tab, setTab] = useState('problem')
  const [socket, setSocket] = useState(null)
  const [liveUpdate, setLiveUpdate] = useState('')

  useEffect(() => {
    assignmentApi.getOne(id).then(r => setAssignment(r.data.assignment)).catch(() => toast.error('Assignment not found'))
    const s = io(SOCKET_URL, { withCredentials: true })
    if (user?._id) s.emit('join-room', user._id)
    s.on('submission-start', () => setLiveUpdate('Running test cases...'))
    s.on('submission-complete', (d) => { setLiveUpdate(''); setResult(p => p ? { ...p, aiFeedback: d.feedback } : p) })
    setSocket(s)
    return () => s.disconnect()
  }, [id, user])

  const onDrop = useCallback((files) => { if (files[0]) { setFile(files[0]); setTab('code'); toast.success(`Loaded: ${files[0].name}`) } }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/*': ['.cpp', '.c', '.py', '.java', '.js'], 'application/zip': ['.zip'] }, maxFiles: 1 })

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    setCode(LANG_TEMPLATES[lang] || '')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setResult(null)
    try {
      let response
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('language', language)
        if (id !== 'practice') fd.append('assignmentId', id)
        response = await submissionApi.submitFile(fd)
      } else {
        response = await submissionApi.submit({ code, language, assignmentId: id !== 'practice' ? id : undefined })
      }
      setResult(response.data.submission)
      setTab('results')
      const v = response.data.submission.verdict
      v === 'AC' ? toast.success('Accepted! Great job! 🎉') : toast.error(`${VERDICT_CONFIG[v]?.label || v}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  const downloadPDF = async () => {
    if (!result?._id) return
    try {
      const res = await submissionApi.downloadPDF(result._id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `report_${result._id}.pdf`; a.click()
      toast.success('PDF downloaded!')
    } catch(e) { toast.error('PDF generation failed') }
  }

  if (!assignment) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>

  const vc = result ? VERDICT_CONFIG[result.verdict] : null

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - problem */}
        <div className="w-[45%] border-r border-white/10 flex flex-col">
          <div className="flex border-b border-white/10">
            {['problem', 'results'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? 'border-cyan text-cyan' : 'border-transparent text-gray-400 hover:text-white'}`}>
                {t}{t === 'results' && result && <span className={`ml-2 text-xs font-bold ${vc?.color}`}>{result.verdict}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'problem' ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${assignment.difficulty === 'easy' ? 'bg-success/20 text-success' : assignment.difficulty === 'medium' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                    {assignment.difficulty?.toUpperCase()}
                  </span>
                  <h1 className="text-xl font-bold">{assignment.title}</h1>
                </div>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-6">{assignment.problemStatement}</div>
                {assignment.sampleInput && (
                  <div className="mb-4">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">Sample Input</div>
                    <pre className="bg-navy-2 rounded-lg p-3 text-green-400 text-sm font-mono">{assignment.sampleInput}</pre>
                  </div>
                )}
                {assignment.sampleOutput && (
                  <div className="mb-4">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">Sample Output</div>
                    <pre className="bg-navy-2 rounded-lg p-3 text-cyan text-sm font-mono">{assignment.sampleOutput}</pre>
                  </div>
                )}
                {assignment.constraints && (
                  <div><div className="text-xs font-bold text-gray-400 uppercase mb-2">Constraints</div>
                  <div className="text-gray-300 text-sm">{assignment.constraints}</div></div>
                )}
              </div>
            ) : (
              <div>
                {result ? (
                  <div>
                    {/* Verdict Banner */}
                    <div className={`${vc?.bg} border ${vc?.border} rounded-xl p-4 mb-6 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <vc.icon className={`w-6 h-6 ${vc?.color}`} />
                        <div>
                          <div className={`font-black text-lg ${vc?.color}`}>{result.verdict} — {vc?.label}</div>
                          <div className="text-gray-400 text-sm">Score: {result.score}/{result.totalScore} • {result.passedTests}/{result.totalTests} tests passed</div>
                        </div>
                      </div>
                      <button onClick={downloadPDF} className="btn-outline text-sm py-2 flex items-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </div>

                    {/* Test Results */}
                    <div className="space-y-2 mb-6">
                      {result.testResults?.map((r, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${r.verdict === 'AC' ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'}`}>
                          <div className="flex items-center gap-2">
                            {r.verdict === 'AC' ? <CheckCircle className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-danger" />}
                            <span className="text-sm">Test {i+1}</span>
                            <span className="text-xs text-gray-500 capitalize">{r.type}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className={`font-bold ${r.verdict === 'AC' ? 'text-success' : 'text-danger'}`}>{r.verdict}</span>
                            <span>{r.executionTime}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI Feedback */}
                    {liveUpdate && <div className="flex items-center gap-2 text-cyan text-sm mb-4 animate-pulse"><Brain className="w-4 h-4" />{liveUpdate}</div>}
                    {result.aiFeedback?.summary && (
                      <div className="card border-cyan/30">
                        <div className="flex items-center gap-2 mb-3 text-cyan font-bold"><Brain className="w-4 h-4" /> AI Feedback</div>
                        <p className="text-gray-300 text-sm mb-4">{result.aiFeedback.summary}</p>
                        {result.aiFeedback.bugs?.length > 0 && (
                          <div className="mb-3">
                            <div className="text-danger text-xs font-bold uppercase mb-2">Bugs Found</div>
                            {result.aiFeedback.bugs.map((b,i) => <div key={i} className="text-sm text-gray-300 flex gap-2 mb-1"><span className="text-danger">•</span>{b}</div>)}
                          </div>
                        )}
                        {result.aiFeedback.improvements?.length > 0 && (
                          <div>
                            <div className="text-success text-xs font-bold uppercase mb-2">Improvements</div>
                            {result.aiFeedback.improvements.map((imp,i) => <div key={i} className="text-sm text-gray-300 flex gap-2 mb-1"><span className="text-success">•</span>{imp}</div>)}
                          </div>
                        )}
                        {result.aiFeedback.complexity && <div className="mt-3 text-xs text-gray-400 border-t border-white/10 pt-3">Complexity: {result.aiFeedback.complexity}</div>}
                      </div>
                    )}
                  </div>
                ) : <div className="text-center text-gray-500 py-12">Submit your code to see results</div>}
              </div>
            )}
          </div>
        </div>

        {/* Right panel - editor */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-navy-2">
            <select value={language} onChange={e => handleLanguageChange(e.target.value)}
              className="bg-navy-light border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan">
              {['cpp','python','java','javascript','c'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
            <div {...getRootProps()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-all ${isDragActive ? 'border-cyan bg-cyan/10 text-cyan' : 'border-white/20 text-gray-400 hover:border-white/40'}`}>
              <input {...getInputProps()} />
              <FolderOpen className="w-4 h-4" /> {file ? file.name.substring(0,20) : 'Upload File/ZIP'}
            </div>
            {file && <button onClick={() => setFile(null)} className="text-gray-500 hover:text-danger"><X className="w-4 h-4" /></button>}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleSubmit} disabled={submitting}
                className="btn-primary flex items-center gap-2 py-2">
                {submitting ? <><span className="animate-spin w-4 h-4 border-2 border-navy border-t-transparent rounded-full" /> Running...</> : <><Play className="w-4 h-4" /> Submit</>}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language === 'javascript' ? 'javascript' : language}
              value={code}
              onChange={v => setCode(v || '')}
              theme="vs-dark"
              options={{
                fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false,
                fontFamily: "'JetBrains Mono', monospace", lineNumbers: 'on',
                renderLineHighlight: 'all', cursorBlinking: 'smooth',
                smoothScrolling: true, automaticLayout: true
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
