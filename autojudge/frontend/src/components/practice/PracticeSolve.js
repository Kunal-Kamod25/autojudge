"use client"
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Editor from '@monaco-editor/react'
import { useDropzone } from 'react-dropzone'
import { Play, FolderOpen, X, CheckCircle, XCircle, Clock, AlertCircle, Brain, Download } from 'lucide-react'
import { practiceApi, submissionApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'

const TEMPLATES = {
  cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    // Your code\n    return 0;\n}',
  python: '# Your solution\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Your code\n    }\n}',
  javascript: 'process.stdin.resume();\nlet input = "";\nprocess.stdin.on("data", d => input += d);\nprocess.stdin.on("end", () => {\n    // parse input and solve\n    console.log();\n});',
  c: '#include <stdio.h>\nint main() {\n    // Your code\n    return 0;\n}'
}
const V_COLORS = { AC:'#00C896', WA:'#FF5A5F', TLE:'#FF9E00', MLE:'#B388FF', RE:'#FF5A5F', CE:'#90A4AE' }

export default function PracticeSolvePage() {
  const { id } = useParams()
  const [problem, setProblem] = useState(null)
  const [language, setLanguage] = useState('cpp')
  const [code, setCode] = useState(TEMPLATES.cpp)
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [tab, setTab] = useState('problem')

  useEffect(() => { practiceApi.getProblem(id).then(r => setProblem(r.data.problem)).catch(() => toast.error('Problem not found')) }, [id])

  const onDrop = useCallback(([f]) => { if (f) { setFile(f); toast.success(`Loaded ${f.name}`) } }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/*': ['.cpp','.c','.py','.java','.js'], 'application/zip': ['.zip'] }, maxFiles: 1 })

  const handleLang = (lang) => { setLanguage(lang); setCode(TEMPLATES[lang] || '') }

  const handleSubmit = async () => {
    setSubmitting(true); setResult(null)
    try {
      let res
      if (file) {
        const fd = new FormData(); fd.append('file', file); fd.append('language', language); fd.append('practiceId', id)
        res = await submissionApi.submitFile(fd)
      } else {
        res = await submissionApi.submit({ code, language })
      }
      setResult(res.data.submission); setTab('result')
      res.data.submission.verdict === 'AC' ? toast.success('Accepted! 🎉') : toast.error(res.data.submission.verdict)
    } catch(e) { toast.error(e.response?.data?.message || 'Submission failed') }
    finally { setSubmitting(false) }
  }

  const downloadPDF = async () => {
    if (!result?._id) return
    try {
      const res = await submissionApi.downloadPDF(result._id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `report_${result._id}.pdf`; a.click()
    } catch { toast.error('PDF failed') }
  }

  if (!problem) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* LEFT — Problem */}
        <div className="w-[42%] flex flex-col border-r border-white/10 overflow-hidden">
          <div className="flex border-b border-white/10 flex-shrink-0">
            {['problem', 'result'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-cyan text-cyan' : 'border-transparent text-gray-400 hover:text-white'}`}>
                {t}{t === 'result' && result && <span className="ml-2 text-xs" style={{ color: V_COLORS[result.verdict] || '#fff' }}>{result.verdict}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'problem' ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${problem.difficulty==='easy' ? 'bg-success/20 text-success' : problem.difficulty==='medium' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                    {problem.difficulty?.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">{problem.category}</span>
                </div>
                <h1 className="text-xl font-black mb-4">{problem.title}</h1>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-6">{problem.problemStatement}</div>
                {problem.sampleInput && <>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Sample Input</p>
                  <pre className="bg-navy-2 rounded-xl p-3 text-green-400 font-mono text-sm mb-4">{problem.sampleInput}</pre>
                </>}
                {problem.sampleOutput && <>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Sample Output</p>
                  <pre className="bg-navy-2 rounded-xl p-3 text-cyan font-mono text-sm mb-4">{problem.sampleOutput}</pre>
                </>}
                {problem.constraints && <>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Constraints</p>
                  <p className="text-gray-300 text-sm">{problem.constraints}</p>
                </>}
              </>
            ) : result ? (
              <>
                <div className="rounded-xl p-4 border mb-4" style={{ background: (V_COLORS[result.verdict]||'#90A4AE')+'15', borderColor: (V_COLORS[result.verdict]||'#90A4AE')+'40' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black" style={{ color: V_COLORS[result.verdict]||'#fff' }}>{result.verdict}</p>
                    <button onClick={downloadPDF} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><Download className="w-3.5 h-3.5" /> PDF</button>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Score: {result.score}/{result.totalScore} · {result.passedTests}/{result.totalTests} tests passed</p>
                  <div className="w-full h-2 bg-navy-light rounded-full mt-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${result.totalTests > 0 ? (result.passedTests/result.totalTests)*100 : 0}%`, background: V_COLORS[result.verdict]||'#90A4AE' }} />
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {result.testResults?.map((r,i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border" style={{ background: (V_COLORS[r.verdict]||'#90A4AE')+'10', borderColor: (V_COLORS[r.verdict]||'#90A4AE')+'30' }}>
                      <div className="flex items-center gap-2 text-sm">
                        {r.verdict === 'AC' ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
                        Test {i+1} <span className="text-xs text-gray-500 capitalize">({r.type})</span>
                      </div>
                      <div className="text-xs" style={{ color: V_COLORS[r.verdict]||'#fff' }}>{r.verdict} · {r.executionTime||0}ms</div>
                    </div>
                  ))}
                </div>
                {result.aiFeedback?.summary && (
                  <div className="card border-cyan/20">
                    <p className="text-cyan font-bold text-sm mb-2 flex items-center gap-2"><Brain className="w-3.5 h-3.5" /> AI Feedback</p>
                    <p className="text-gray-300 text-xs leading-relaxed">{result.aiFeedback.summary}</p>
                  </div>
                )}
              </>
            ) : <p className="text-gray-500 text-sm text-center py-20">Submit code to see results</p>}
          </div>
        </div>

        {/* RIGHT — Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-navy-2 flex-shrink-0">
            <select value={language} onChange={e => handleLang(e.target.value)}
              className="bg-navy-light border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan">
              {['cpp','python','java','javascript','c'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
            <div {...getRootProps()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-all ${isDragActive ? 'border-cyan text-cyan bg-cyan/10' : 'border-white/20 text-gray-400 hover:border-white/40'}`}>
              <input {...getInputProps()} />
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{file ? file.name.slice(0,18) : 'Upload'}</span>
            </div>
            {file && <button onClick={() => setFile(null)} className="text-gray-500 hover:text-danger"><X className="w-4 h-4" /></button>}
            <button onClick={handleSubmit} disabled={submitting}
              className="ml-auto btn-primary flex items-center gap-2 py-2 text-sm">
              {submitting ? <><span className="animate-spin w-4 h-4 border-2 border-navy border-t-transparent rounded-full" />Running…</> : <><Play className="w-4 h-4" />Submit</>}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor height="100%" language={language === 'cpp' ? 'cpp' : language}
              value={code} onChange={v => setCode(v||'')} theme="vs-dark"
              options={{ fontSize:14, minimap:{enabled:false}, fontFamily:"'JetBrains Mono',monospace", lineNumbers:'on', scrollBeyondLastLine:false, automaticLayout:true }} />
          </div>
        </div>
      </div>
    </div>
  )
}
