"use client"
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams } from 'next/navigation'
import Editor from '@monaco-editor/react'
import { useDropzone } from 'react-dropzone'
import {
  Play, Upload, FileCode, Download, FolderOpen, X, CheckCircle, XCircle,
  Clock, AlertCircle, Brain, ChevronDown, ChevronRight, Terminal, 
  Cpu, Package, Zap, Eye, EyeOff
} from 'lucide-react'
import { assignmentApi, submissionApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/lib/store'
import { SOCKET_URL } from '@/config'
import ZipFileExplorer from './ZipFileExplorer'
import GTestResultPanel from './GTestResultPanel'

const LANG_TEMPLATES = {
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
  python: '# Your solution here\ndef solve():\n    pass\n\nsolve()',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}',
  javascript: '// Your solution\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on("line", (line) => {\n    // Process input\n});',
  c: '#include <stdio.h>\n\nint main() {\n    // Your code\n    return 0;\n}'
}

const LANG_ICONS = { cpp: '⚙️', python: '🐍', java: '☕', javascript: '🟨', c: '🔵' }

const VERDICT_CONFIG = {
  AC:  { color: 'text-success',  bg: 'bg-success/10',  border: 'border-success',  icon: CheckCircle, label: 'Accepted' },
  WA:  { color: 'text-danger',   bg: 'bg-danger/10',   border: 'border-danger',   icon: XCircle,     label: 'Wrong Answer' },
  TLE: { color: 'text-warning',  bg: 'bg-warning/10',  border: 'border-warning',  icon: Clock,       label: 'Time Limit Exceeded' },
  CE:  { color: 'text-purple',   bg: 'bg-purple/10',   border: 'border-purple',   icon: AlertCircle, label: 'Compilation Error' },
  RE:  { color: 'text-danger',   bg: 'bg-danger/10',   border: 'border-danger',   icon: AlertCircle, label: 'Runtime Error' },
  MLE: { color: 'text-warning',  bg: 'bg-warning/10',  border: 'border-warning',  icon: AlertCircle, label: 'Memory Limit' },
}

// Detect language from file list
function detectLangFromFiles(files) {
  const extMap = { cpp: 0, c: 0, python: 0, java: 0, javascript: 0 }
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    if (['cpp', 'cc', 'cxx'].includes(ext)) extMap.cpp++
    else if (ext === 'c') extMap.c++
    else if (ext === 'py') extMap.python++
    else if (ext === 'java') extMap.java++
    else if (ext === 'js') extMap.javascript++
  }
  return Object.entries(extMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'cpp'
}

// TestCaseRow: expandable per-test accordion
function TestCaseRow({ r, index }) {
  const [open, setOpen] = useState(false)
  const passed = r.verdict === 'AC'
  const vc = VERDICT_CONFIG[r.verdict] || VERDICT_CONFIG.WA

  return (
    <div className={`border rounded-lg overflow-hidden ${passed ? 'border-success/20' : 'border-danger/25'}`}>
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${passed ? 'bg-success/3 hover:bg-success/5' : 'bg-danger/5 hover:bg-danger/8'}`}>
        {passed ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0" /> : <vc.icon className={`w-4 h-4 ${vc.color} flex-shrink-0`} />}
        <span className="text-sm font-medium text-white">Test {index + 1}</span>
        <span className="text-xs text-gray-500 capitalize">{r.type}</span>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span className={`font-bold ${vc.color}`}>{vc.label}</span>
          <span>{r.executionTime}ms</span>
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/5">
            <div className="p-4 grid grid-cols-1 gap-3">
              {r.input && (
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1.5">Input</div>
                  <pre className="text-xs font-mono bg-navy rounded p-2.5 text-green-400 overflow-x-auto">{r.input}</pre>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {r.expectedOutput && (
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1.5">Expected</div>
                    <pre className="text-xs font-mono bg-navy rounded p-2.5 text-cyan overflow-x-auto">{r.expectedOutput}</pre>
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1.5">Actual</div>
                  <pre className={`text-xs font-mono bg-navy rounded p-2.5 overflow-x-auto ${passed ? 'text-success' : 'text-danger'}`}>
                    {r.actualOutput || '(no output)'}
                  </pre>
                </div>
              </div>
              {r.errorMessage && (
                <div>
                  <div className="text-xs font-bold text-danger uppercase mb-1.5">Error</div>
                  <pre className="text-xs font-mono bg-danger/5 border border-danger/20 rounded p-2.5 text-danger/90 overflow-x-auto whitespace-pre-wrap">{r.errorMessage}</pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AssignmentPage() {
  const { id } = useParams()
  const { user } = useAuthStore()

  const [assignment, setAssignment] = useState(null)
  const [language, setLanguage] = useState('cpp')
  const [code, setCode] = useState(LANG_TEMPLATES.cpp)
  const [file, setFile] = useState(null)
  const [isZip, setIsZip] = useState(false)
  const [zipFiles, setZipFiles] = useState([])
  const [zipLoading, setZipLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [entryFile, setEntryFile] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [leftTab, setLeftTab] = useState('problem')   // problem | results
  const [rightPanel, setRightPanel] = useState('editor') // editor | explorer (zip mode)
  const [liveUpdate, setLiveUpdate] = useState('')
  const [showHiddenTests, setShowHiddenTests] = useState(false)

  useEffect(() => {
    assignmentApi.getOne(id).then(r => setAssignment(r.data.assignment)).catch(() => toast.error('Assignment not found'))
    const s = io(SOCKET_URL, { withCredentials: true })
    if (user?._id) s.emit('join-room', user._id)
    s.on('submission-start', () => setLiveUpdate('Running test cases...'))
    s.on('submission-complete', (d) => {
      setLiveUpdate('')
      setResult(prev => prev ? { ...prev, aiFeedback: d.feedback } : prev)
    })
    return () => s.disconnect()
  }, [id, user])

  // Load ZIP file contents when a ZIP is dropped
  const loadZipContents = useCallback(async (f, lang) => {
    setZipLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('language', lang)
      const res = await submissionApi.extractZip(fd)
      const files = res.data.files || []
      setZipFiles(files)
      setSelectedFile(null)
      setEntryFile('')

      // Auto-detect main entry if only one main file
      const mains = files.filter(f => f.isSourceFile && f.hasMain)
      if (mains.length === 1) setEntryFile(mains[0].name)

      setRightPanel('explorer')
    } catch (e) {
      toast.error('Failed to read ZIP contents')
      setRightPanel('editor')
    } finally {
      setZipLoading(false)
    }
  }, [])

  const onDrop = useCallback(async (files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const zip = f.name.endsWith('.zip')
    setIsZip(zip)
    if (zip) {
      // Detect language first from filename or default cpp
      const detectedLang = language
      toast.success(`Loading ZIP: ${f.name}`)
      await loadZipContents(f, detectedLang)
    } else {
      setZipFiles([])
      setRightPanel('editor')
      toast.success(`Loaded: ${f.name}`)
    }
  }, [language, loadZipContents])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.cpp', '.c', '.py', '.java', '.js'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    maxFiles: 1
  })

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    setCode(LANG_TEMPLATES[lang] || '')
    // Re-extract ZIP with new language if needed
    if (file && isZip) {
      loadZipContents(file, lang)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setIsZip(false)
    setZipFiles([])
    setEntryFile('')
    setSelectedFile(null)
    setRightPanel('editor')
  }

  const handleSubmit = async () => {
    // Multi-main guard
    const mains = zipFiles.filter(f => f.isSourceFile && f.hasMain)
    if (isZip && mains.length > 1 && !entryFile) {
      toast.error('Please select an entry file before submitting')
      return
    }

    setSubmitting(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('language', language)
      if (id !== 'practice') fd.append('assignmentId', id)

      if (file) {
        fd.append('file', file)
        if (entryFile) fd.append('entryFile', entryFile)
        const response = await submissionApi.submitFile(fd)
        setResult(response.data.submission)
      } else {
        const response = await submissionApi.submit({ code, language, assignmentId: id !== 'practice' ? id : undefined })
        setResult(response.data.submission)
      }

      setLeftTab('results')
      const v = result?.verdict
      if (v === 'AC') toast.success('Accepted! 🎉')
      else if (v) toast.error(`${VERDICT_CONFIG[v]?.label || v}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPDF = async () => {
    if (!result?._id) return
    try {
      const res = await submissionApi.downloadPDF(result._id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `report_${result._id}.pdf`; a.click()
      toast.success('PDF downloaded!')
    } catch (e) { toast.error('PDF generation failed') }
  }

  if (!assignment) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" />
    </div>
  )

  const vc = result ? (VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.WA) : null
  const visibleTests = result?.testResults?.filter(r => showHiddenTests || r.type !== 'hidden') || []
  const hasHiddenTests = result?.testResults?.some(r => r.type === 'hidden')

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>

        {/* ── Left Panel: Problem + Results ─────────────────── */}
        <div className="w-[42%] border-r border-white/10 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            {['problem', 'results'].map(t => (
              <button key={t} onClick={() => setLeftTab(t)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${leftTab === t ? 'border-cyan text-cyan' : 'border-transparent text-gray-400 hover:text-white'}`}>
                {t}
                {t === 'results' && result && (
                  <span className={`ml-2 text-xs font-bold ${vc?.color}`}>{result.verdict}</span>
                )}
              </button>
            ))}
            {/* Language info badge */}
            <div className="ml-auto flex items-center pr-4 gap-2">
              <span className="text-xs px-2 py-1 rounded bg-navy-2 border border-white/10 text-gray-400">
                {LANG_ICONS[language]} {language.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {leftTab === 'problem' ? (
              /* ── Problem Statement ── */
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    assignment.difficulty === 'easy' ? 'bg-success/20 text-success' :
                    assignment.difficulty === 'medium' ? 'bg-warning/20 text-warning' :
                    'bg-danger/20 text-danger'
                  }`}>{assignment.difficulty?.toUpperCase()}</span>
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
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">Constraints</div>
                    <div className="text-gray-300 text-sm">{assignment.constraints}</div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Results Panel ── */
              <div>
                {result ? (
                  <div className="space-y-5">
                    {/* Verdict Banner */}
                    <div className={`${vc?.bg} border ${vc?.border} rounded-xl p-4 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <vc.icon className={`w-6 h-6 ${vc?.color}`} />
                        <div>
                          <div className={`font-black text-lg ${vc?.color}`}>{result.verdict} — {vc?.label}</div>
                          <div className="text-gray-400 text-sm">
                            Score: {result.score}/{result.totalScore}
                            {!result.isGTest && ` • ${result.passedTests}/${result.totalTests} tests passed`}
                          </div>
                          {result.isGTest && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/30 inline-flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> Google Test Mode
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={downloadPDF} className="btn-outline text-sm py-2 flex items-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </div>

                    {/* GTest Panel */}
                    {result.isGTest ? (
                      <GTestResultPanel
                        gtestData={result.gtestData}
                        rawOutput={result.testResults?.[0]?.actualOutput}
                      />
                    ) : (
                      /* Standard Test Case Results */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-400">Test Results</span>
                          {hasHiddenTests && (
                            <button onClick={() => setShowHiddenTests(s => !s)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan transition-colors">
                              {showHiddenTests ? <><EyeOff className="w-3.5 h-3.5" /> Hide hidden</> : <><Eye className="w-3.5 h-3.5" /> Show hidden</>}
                            </button>
                          )}
                        </div>
                        {visibleTests.map((r, i) => <TestCaseRow key={i} r={r} index={i} />)}
                      </div>
                    )}

                    {/* AI Feedback */}
                    {liveUpdate && (
                      <div className="flex items-center gap-2 text-cyan text-sm animate-pulse">
                        <Brain className="w-4 h-4" />{liveUpdate}
                      </div>
                    )}
                    {result.aiFeedback?.summary && (
                      <div className="card border-cyan/30">
                        <div className="flex items-center gap-2 mb-3 text-cyan font-bold"><Brain className="w-4 h-4" /> AI Feedback</div>
                        <p className="text-gray-300 text-sm mb-4">{result.aiFeedback.summary}</p>
                        {result.aiFeedback.bugs?.length > 0 && (
                          <div className="mb-3">
                            <div className="text-danger text-xs font-bold uppercase mb-2">Bugs Found</div>
                            {result.aiFeedback.bugs.map((b, i) => <div key={i} className="text-sm text-gray-300 flex gap-2 mb-1"><span className="text-danger">•</span>{b}</div>)}
                          </div>
                        )}
                        {result.aiFeedback.improvements?.length > 0 && (
                          <div>
                            <div className="text-success text-xs font-bold uppercase mb-2">Improvements</div>
                            {result.aiFeedback.improvements.map((imp, i) => <div key={i} className="text-sm text-gray-300 flex gap-2 mb-1"><span className="text-success">•</span>{imp}</div>)}
                          </div>
                        )}
                        {result.aiFeedback.complexity && (
                          <div className="mt-3 text-xs text-gray-400 border-t border-white/10 pt-3">Complexity: {result.aiFeedback.complexity}</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
                    <div className="w-14 h-14 rounded-full bg-navy-2 border border-white/10 flex items-center justify-center">
                      <Zap className="w-7 h-7 text-gray-600" />
                    </div>
                    <div className="text-gray-500">Submit your code to see results</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Side: Toolbar + Editor/Explorer ─────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-navy-2 flex-shrink-0 flex-wrap">
            {/* Language Select */}
            <select value={language} onChange={e => handleLanguageChange(e.target.value)}
              className="bg-navy-light border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan">
              {['cpp', 'python', 'java', 'javascript', 'c'].map(l => (
                <option key={l} value={l}>{LANG_ICONS[l]} {l.toUpperCase()}</option>
              ))}
            </select>

            {/* File Upload / ZIP Zone */}
            <div {...getRootProps()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-all
                ${isDragActive ? 'border-cyan bg-cyan/10 text-cyan' : 'border-white/20 text-gray-400 hover:border-white/40'}`}>
              <input {...getInputProps()} />
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">
                {file ? (
                  <span className="flex items-center gap-1">
                    {isZip ? <Package className="w-3.5 h-3.5 text-cyan" /> : <FileCode className="w-3.5 h-3.5 text-cyan" />}
                    {file.name.substring(0, 22)}{file.name.length > 22 ? '…' : ''}
                  </span>
                ) : 'Upload File / ZIP'}
              </span>
            </div>

            {file && (
              <button onClick={handleRemoveFile} className="text-gray-500 hover:text-danger transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* ZIP panel toggle */}
            {isZip && (
              <button onClick={() => setRightPanel(p => p === 'editor' ? 'explorer' : 'editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all
                  ${rightPanel === 'explorer' ? 'border-cyan text-cyan bg-cyan/10' : 'border-white/20 text-gray-400 hover:border-white/40'}`}>
                <Package className="w-4 h-4" />
                {zipLoading ? 'Loading…' : `Files (${zipFiles.length})`}
              </button>
            )}

            {/* Submit Button */}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleSubmit} disabled={submitting}
                className="btn-primary flex items-center gap-2 py-2 px-5">
                {submitting
                  ? <><span className="animate-spin w-4 h-4 border-2 border-navy border-t-transparent rounded-full" /> Running…</>
                  : <><Play className="w-4 h-4" /> Submit</>}
              </button>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex flex-1 overflow-hidden">
            {/* ZIP File Explorer panel */}
            {isZip && rightPanel === 'explorer' && (
              <div className="w-64 flex-shrink-0 overflow-hidden">
                <ZipFileExplorer
                  files={zipFiles}
                  selectedFile={selectedFile}
                  onFileClick={setSelectedFile}
                  entryFile={entryFile}
                  onSetEntry={setEntryFile}
                  language={language}
                />
              </div>
            )}

            {/* Editor */}
            <div className={`flex-1 overflow-hidden ${isZip && rightPanel === 'explorer' ? 'border-l border-white/10' : ''}`}>
              {(!isZip || rightPanel === 'editor') && (
                <Editor
                  height="100%"
                  language={language === 'cpp' ? 'cpp' : language}
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
              )}

              {isZip && rightPanel === 'explorer' && selectedFile?.content && (
                /* Show selected file in readonly editor */
                <Editor
                  height="100%"
                  language={(() => {
                    const ext = (selectedFile.name.split('.').pop() || '').toLowerCase()
                    return ext === 'py' ? 'python' : ext === 'js' ? 'javascript' : ext === 'java' ? 'java' : 'cpp'
                  })()}
                  value={selectedFile.content}
                  theme="vs-dark"
                  options={{
                    readOnly: true, fontSize: 13, minimap: { enabled: false },
                    scrollBeyondLastLine: false, fontFamily: "'JetBrains Mono', monospace",
                    lineNumbers: 'on', automaticLayout: true, renderLineHighlight: 'none'
                  }}
                />
              )}

              {isZip && rightPanel === 'explorer' && !selectedFile && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-gray-600">
                  <FileCode className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Click a file to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
