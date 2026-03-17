"use client"
import { useCallback, useState } from 'react'
import Editor from '@monaco-editor/react'
import { useDropzone } from 'react-dropzone'
import { FolderOpen, Play, X, Terminal, AlertCircle, CheckCircle2, Clock, Brain, Files } from 'lucide-react'
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
  const [selectedInputFiles, setSelectedInputFiles] = useState([])
  const [inputExecutionMode, setInputExecutionMode] = useState('separate')
  const [file, setFile] = useState(null)
  const [zipFiles, setZipFiles] = useState([])
  const [selectedFilePreview, setSelectedFilePreview] = useState(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [batchResults, setBatchResults] = useState([])

  const onDrop = useCallback((files) => {
    if (!files?.[0]) return
    const f = files[0]
    setFile(f)
    setZipFiles([])
    setSelectedInputFiles([])
    setInputExecutionMode('separate')
    setSelectedFilePreview(null)
    
    if (f.name.endsWith('.zip')) {
      extractZipFiles(f)
    } else {
      toast.success(`Loaded: ${f.name}`)
    }
  }, [])

  const extractZipFiles = async (zipFile) => {
    try {
      const fd = new FormData()
      fd.append('file', zipFile)
      fd.append('language', language)
      const res = await submissionApi.extractZip(fd)
      setZipFiles(res.data.files)
      toast.success(`ZIP loaded: ${res.data.files.length} files`)
    } catch (err) {
      toast.error('Failed to extract ZIP')
    }
  }

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
    setBatchResults([])

    try {
      const runOnce = async (runInput) => {
        if (file) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('language', language)
          fd.append('input', runInput)
          const res = await submissionApi.runCustomFile(fd)
          return res.data.submission
        }
        const res = await submissionApi.runCustom({ code, language, input: runInput })
        return res.data.submission
      }

      if (selectedInputFiles.length > 0) {
        if (inputExecutionMode === 'combine') {
          const combinedInput = selectedInputFiles
            .map((name) => zipFiles.find((f) => f.name === name)?.content || '')
            .join('\n')

          const submission = await runOnce(combinedInput)
          setResult({ ...submission, combinedFiles: [...selectedInputFiles] })
          toast.success(`Ran combined input from ${selectedInputFiles.length} file(s)`)
        } else {
          const results = []
          for (const inputFileName of selectedInputFiles) {
            const submission = await runOnce(`@${inputFileName}`)
            results.push({ ...submission, inputFileName })
          }
          setBatchResults(results)
          const acCount = results.filter(r => r.verdict === 'AC').length
          toast.success(`Ran ${results.length} test case(s). Passed: ${acCount}`)
        }
      } else {
        const submission = await runOnce(input)
        setResult(submission)
        if (submission.verdict === 'AC') toast.success('Program ran successfully')
        else toast.error(submission.verdict)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  const v = result ? (VERDICT_STYLE[result.verdict] || VERDICT_STYLE.RE) : null

  const sourceFiles = zipFiles.filter(f => f.isSourceFile)
  const inputFiles = zipFiles.filter(f => f.isInputFile)

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-6 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black">Run My Code</h1>
          <p className="text-gray-400 text-sm mt-1">Upload single file or ZIP project. See files, select input sources, and run instantly.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Editor Panel */}
          <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-navy-2">
              <select value={language} onChange={e => handleLanguage(e.target.value)}
                className="bg-navy-light border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan">
                {['cpp','python','java','javascript','c'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>

              <div {...getRootProps()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-all ${isDragActive ? 'border-cyan bg-cyan/10 text-cyan' : 'border-white/20 text-gray-400 hover:border-white/40'}`}>
                <input {...getInputProps()} />
                <FolderOpen className="w-4 h-4" /> {file ? file.name.substring(0, 24) : 'Upload File/ZIP'}
              </div>

              {file && <button onClick={() => { setFile(null); setZipFiles([]); }} className="text-gray-500 hover:text-danger"><X className="w-4 h-4" /></button>}

              <button onClick={handleRun} disabled={running}
                className="ml-auto btn-primary py-2 flex items-center gap-2">
                {running ? <><span className="animate-spin w-4 h-4 border-2 border-navy border-t-transparent rounded-full" /> Running...</> : <><Play className="w-4 h-4" /> Run</>}
              </button>
            </div>

            {!file && (
              <div className="flex-1">
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

            {file && zipFiles.length > 0 && (
              <div className="flex-1 flex flex-col">
                <div className="border-b border-white/10 bg-navy-2 px-4 py-2 flex gap-2 overflow-x-auto">
                  <button onClick={() => setSelectedFilePreview(null)}
                    className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${!selectedFilePreview ? 'bg-cyan text-navy' : 'text-gray-400 hover:text-white'}`}>
                    Overview
                  </button>
                  {sourceFiles.map((f, i) => (
                    <button key={i} onClick={() => setSelectedFilePreview(f.name)}
                      className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${selectedFilePreview === f.name ? 'bg-cyan text-navy' : 'text-gray-400 hover:text-white'}`}>
                      {f.name.split('/').pop()}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {!selectedFilePreview ? (
                    <div className="space-y-4 text-sm">
                      {sourceFiles.length > 0 && (
                        <div>
                          <p className="text-cyan font-semibold mb-2 flex items-center gap-2"><Files className="w-4 h-4" /> Source Files ({sourceFiles.length})</p>
                          <div className="space-y-1 ml-2">
                            {sourceFiles.map((f, i) => (
                              <p key={i} className="text-gray-300 cursor-pointer hover:text-cyan" onClick={() => setSelectedFilePreview(f.name)}>
                                📄 {f.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {inputFiles.length > 0 && (
                        <div>
                          <p className="text-success font-semibold mb-2 flex items-center gap-2"><Terminal className="w-4 h-4" /> Input Files ({inputFiles.length})</p>
                          <div className="space-y-1 ml-2">
                            {inputFiles.map((f, i) => (
                              <p key={i} className="text-gray-300">📋 {f.name}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {zipFiles.length === sourceFiles.length + inputFiles.length ? null : (
                        <p className="text-gray-500 text-xs">{zipFiles.length} total files in project</p>
                      )}
                    </div>
                  ) : (
                    <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words bg-navy-2 p-3 rounded">
                      {zipFiles.find(f => f.name === selectedFilePreview)?.content || 'File content not available'}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {file && zipFiles.length === 0 && (
              <div className="p-6 text-center text-gray-400">
                Extracting ZIP file...
              </div>
            )}
          </div>

          {/* Input & Results Panel */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Terminal className="w-4 h-4 text-cyan" /> Input & Project Files</h3>
              
              {/* Project Files Summary */}
              {zipFiles.length > 0 && (
                <div className="mb-4 p-3 bg-navy-2 border border-white/10 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan font-semibold">📁 Project Files:</span>
                    <span className="text-gray-400">{sourceFiles.length} source, {inputFiles.length} input</span>
                  </div>
                  
                  {sourceFiles.length > 0 && (
                    <div>
                      <p className="text-gray-500">Source Files:</p>
                      <div className="ml-2 space-y-1">
                        {sourceFiles.map((f, i) => (
                          <p key={i} className="text-cyan">📄 {f.name}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {inputFiles.length > 0 && (
                    <div>
                      <p className="text-gray-500">Input Files:</p>
                      <div className="ml-2 space-y-1">
                        {inputFiles.map((f, i) => (
                          <p key={i} className="text-success">📋 {f.name}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input Options - Always Show Both */}
              <div className="space-y-3">
                {/* Option 1: Paste Input */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Type Input Manually</label>
                  <textarea
                    value={input}
                    onChange={e => {
                      setSelectedInputFiles([])
                      setInput(e.target.value)
                    }}
                    className="w-full h-28 bg-navy-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-cyan"
                    placeholder="Enter test input here or select a file below"
                  />
                </div>

                {/* Option 2: Select from Files */}
                {inputFiles.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1.5">Or Select One/More Input Files</label>

                    {selectedInputFiles.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">How to run selected files</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setInputExecutionMode('separate')}
                            className={`px-2 py-1 text-xs rounded border ${inputExecutionMode === 'separate' ? 'border-cyan text-cyan bg-cyan/10' : 'border-white/20 text-gray-400'}`}
                          >
                            Separate (test cases)
                          </button>
                          <button
                            type="button"
                            onClick={() => setInputExecutionMode('combine')}
                            className={`px-2 py-1 text-xs rounded border ${inputExecutionMode === 'combine' ? 'border-cyan text-cyan bg-cyan/10' : 'border-white/20 text-gray-400'}`}
                          >
                            Combine (A + B)
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-navy-2 border border-white/10 rounded-lg p-2 max-h-36 overflow-auto space-y-1">
                      {inputFiles.map((f, i) => (
                        <label key={i} className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedInputFiles.includes(f.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedInputFiles(prev => [...prev, f.name])
                              } else {
                                setSelectedInputFiles(prev => prev.filter(name => name !== f.name))
                              }
                            }}
                          />
                          <span>{f.name}</span>
                        </label>
                      ))}
                    </div>

                    {selectedInputFiles.length > 0 && (
                      <div className="mt-2 bg-navy-2 border border-white/10 rounded-lg p-2 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-success font-semibold">
                            {inputExecutionMode === 'combine'
                              ? `Combining ${selectedInputFiles.length} input file(s) into one run`
                              : `Running ${selectedInputFiles.length} input file(s) as test cases`
                            }
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedInputFiles([])}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            Clear
                          </button>
                        </div>
                        {selectedInputFiles.map((name, idx) => (
                          <div key={idx}>
                            <p className="text-cyan mb-1">{name}</p>
                            <pre className="text-gray-300 font-mono whitespace-pre-wrap break-words max-h-16 overflow-auto">
                              {zipFiles.find(f => f.name === name)?.content || 'Loading...'}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="card min-h-[250px]">
              <h3 className="font-bold mb-3">Run Result</h3>

              {!result && batchResults.length === 0 && <p className="text-gray-500 text-sm">Run your code to see output and errors.</p>}

              {batchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-navy-2 border border-white/10 rounded-lg p-3 text-sm flex items-center justify-between">
                    <span className="text-gray-300">Test Cases Passed</span>
                    <span className="text-cyan font-bold">
                      {batchResults.filter((x) => x.verdict === 'AC').length}/{batchResults.length}
                    </span>
                  </div>

                  {batchResults.map((r, i) => {
                    const vv = VERDICT_STYLE[r.verdict] || VERDICT_STYLE.RE
                    return (
                      <div key={i} className="border border-white/10 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-cyan font-semibold">Test Case {i + 1}: {r.inputFileName}</p>
                          <span className={`text-xs font-semibold ${vv.text}`}>{r.verdict}</span>
                        </div>
                        <pre className="bg-navy-2 rounded-lg p-2 text-xs text-green-300 font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">{r.output || '(no output)'}</pre>
                        {r.errorMessage && (
                          <pre className="bg-danger/10 border border-danger/30 rounded-lg p-2 text-xs text-danger font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">{r.errorMessage}</pre>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {result.combinedFiles?.length > 0 && (
                    <div className="bg-navy-2 border border-white/10 rounded-lg p-3 text-xs">
                      <p className="text-cyan font-semibold mb-1">Combined Input Files ({result.combinedFiles.length})</p>
                      <p className="text-gray-300">{result.combinedFiles.join(', ')}</p>
                    </div>
                  )}

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
                    <pre className="bg-navy-2 rounded-lg p-3 text-sm text-green-300 font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">{result.output || '(no output)'}</pre>
                  </div>

                  {result.errorMessage && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Error</p>
                      <pre className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">{result.errorMessage}</pre>
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
