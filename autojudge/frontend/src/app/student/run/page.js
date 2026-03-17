"use client"
import { useCallback, useState } from 'react'
import Editor from '@monaco-editor/react'
import { useDropzone } from 'react-dropzone'
import { FolderOpen, Play, X, Terminal, AlertCircle, CheckCircle2, Clock, Brain } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { submissionApi } from '@/lib/api'
import toast from 'react-hot-toast'

const TEMPLATES = {
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    // Matrix input example\n    int n, m;\n    cin >> n >> m;\n    vector<vector<int>> a(n, vector<int>(m));\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < m; j++) cin >> a[i][j];\n    }\n\n    long long sum = 0;\n    for (auto &row : a) for (int x : row) sum += x;\n    cout << sum << "\\n";\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello from C\\n");\n    return 0;\n}',
  python: 'def solve():\n    import sys\n    data = sys.stdin.read().strip()\n    print(data)\n\nsolve()',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            System.out.println(sc.nextLine());\n        }\n    }\n}',
  javascript: 'const fs = require("fs");\nconst input = fs.readFileSync(0, "utf8").trim();\nconsole.log(input);'
}

const VERDICT_STYLE = {
  AC: { text: 'text-success', bg: 'bg-success/10', icon: CheckCircle2, label: 'Ran successfully' },
  CE: { text: 'text-purple', bg: 'bg-purple/10', icon: AlertCircle, label: 'Compilation Error' },
  RE: { text: 'text-danger', bg: 'bg-danger/10', icon: AlertCircle, label: 'Runtime Error' },
  TLE: { text: 'text-warning', bg: 'bg-warning/10', icon: Clock, label: 'Time Limit Exceeded' }
}

export default function StudentRunPage() {
  const [language, setLanguage] = useState('cpp')
  const [code, setCode] = useState(TEMPLATES.cpp)
  const [input, setInput] = useState('2 3\n1 2 3\n4 5 6')
  const [file, setFile] = useState(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  const onDrop = useCallback((files) => {
    if (!files?.[0]) return
    setFile(files[0])
    toast.success(`Loaded: ${files[0].name}`)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/*': ['.cpp', '.c', '.py', '.java', '.js'], 'application/zip': ['.zip'] },
    maxFiles: 1
  })

  const handleLanguage = (nextLang) => {
    setLanguage(nextLang)
    if (!file) setCode(TEMPLATES[nextLang] || '')
  }

  const handleRun = async () => {
    if (!file && !code.trim()) {
      toast.error('Please add code first')
      return
    }

    setRunning(true)
    setResult(null)

    try {
      let res
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('language', language)
        fd.append('input', input)
        res = await submissionApi.runCustomFile(fd)
      } else {
        res = await submissionApi.runCustom({ code, language, input })
      }

      setResult(res.data.submission)
      if (res.data.submission.verdict === 'AC') toast.success('Program ran successfully')
      else toast.error(res.data.submission.verdict)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  const v = result ? (VERDICT_STYLE[result.verdict] || VERDICT_STYLE.RE) : null

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-6 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black">Run My Code</h1>
          <p className="text-gray-400 text-sm mt-1">Upload a single file or ZIP project (.cpp/.hpp supported), add input, and run instantly.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-navy-2">
              <select value={language} onChange={e => handleLanguage(e.target.value)}
                className="bg-navy-light border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan">
                {['cpp','python','java','javascript','c'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>

              <div {...getRootProps()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-all ${isDragActive ? 'border-cyan bg-cyan/10 text-cyan' : 'border-white/20 text-gray-400 hover:border-white/40'}`}>
                <input {...getInputProps()} />
                <FolderOpen className="w-4 h-4" /> {file ? file.name.substring(0, 24) : 'Upload File/ZIP'}
              </div>

              {file && <button onClick={() => setFile(null)} className="text-gray-500 hover:text-danger"><X className="w-4 h-4" /></button>}

              <button onClick={handleRun} disabled={running}
                className="ml-auto btn-primary py-2 flex items-center gap-2">
                {running ? <><span className="animate-spin w-4 h-4 border-2 border-navy border-t-transparent rounded-full" /> Running...</> : <><Play className="w-4 h-4" /> Run</>}
              </button>
            </div>

            {!file && (
              <div className="h-[420px]">
                <Editor
                  height="100%"
                  language={language === 'cpp' ? 'cpp' : language === 'javascript' ? 'javascript' : language}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                />
              </div>
            )}

            {file && (
              <div className="p-6 text-center text-gray-400">
                File mode enabled. Click Run to execute your uploaded file.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Terminal className="w-4 h-4 text-cyan" /> Custom Input</h3>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full h-40 bg-navy-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-cyan"
                placeholder="Paste your input here"
              />
            </div>

            <div className="card min-h-[250px]">
              <h3 className="font-bold mb-3">Run Result</h3>

              {!result && <p className="text-gray-500 text-sm">Run your code to see output and errors.</p>}

              {result && (
                <div className="space-y-4">
                  <div className={`${v.bg} rounded-lg p-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <v.icon className={`w-5 h-5 ${v.text}`} />
                      <span className={`font-bold ${v.text}`}>{result.verdict} - {v.label}</span>
                      {result.isGTest && <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-cyan border border-cyan/30">Google Test</span>}
                    </div>
                    <span className="text-xs text-gray-400">{result.executionTime || 0} ms</span>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Program Output</p>
                    <pre className="bg-navy-2 rounded-lg p-3 text-sm text-green-300 font-mono whitespace-pre-wrap break-words">{result.output || '(no output)'}</pre>
                  </div>

                  {result.errorMessage && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Error</p>
                      <pre className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger font-mono whitespace-pre-wrap break-words">{result.errorMessage}</pre>
                    </div>
                  )}

                  {result.aiFeedback?.summary && (
                    <div className="bg-cyan/5 border border-cyan/20 rounded-lg p-3">
                      <div className="text-cyan font-semibold text-sm mb-1 flex items-center gap-2"><Brain className="w-4 h-4" /> AI Feedback</div>
                      <p className="text-sm text-gray-300">{result.aiFeedback.summary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
