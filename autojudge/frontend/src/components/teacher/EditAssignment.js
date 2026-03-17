"use client"
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { Brain, Plus, Trash2, ArrowLeft, Save, Eye } from 'lucide-react'
import { assignmentApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'

const DEFAULT_TC = { input:'', expectedOutput:'', type:'basic', timeLimit:2000, points:10, isHidden:false }

export default function EditAssignmentPage() {
  const { id } = useParams()
  const router = useRouter()
  const [form, setForm] = useState(null)
  const [testCases, setTestCases] = useState([])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    assignmentApi.getOne(id)
      .then(r => { const a = r.data.assignment; setForm(a); setTestCases(a.testCases || []) })
      .catch(() => toast.error('Assignment not found'))
  }, [id])

  const addTC = () => setTestCases(p => [...p, { ...DEFAULT_TC }])
  const removeTC = (i) => setTestCases(p => p.filter((_, idx) => idx !== i))
  const updateTC = (i, k, v) => setTestCases(p => p.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc))

  const toggleLang = (lang) => setForm(p => ({
    ...p, languages: p.languages.includes(lang) ? p.languages.filter(l => l !== lang) : [...p.languages, lang]
  }))

  const generateTests = async () => {
    if (!form.problemStatement) return toast.error('Problem statement required')
    setGenerating(true)
    try {
      const res = await assignmentApi.generateTests(id, { language: form.languages[0], count: 20 })
      setTestCases(p => [...p, ...res.data.testCases])
      toast.success(`Generated ${res.data.testCases.length} new test cases!`)
    } catch { toast.error('Generation failed') }
    finally { setGenerating(false) }
  }

  const handleSave = async (publish) => {
    setSaving(true)
    try {
      await assignmentApi.update(id, { ...form, testCases, isPublished: publish ?? form.isPublished })
      toast.success('Saved!')
      router.push('/teacher/dashboard')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  if (!form) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black">Edit Assignment</h1>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${form.isPublished ? 'bg-success/20 text-success' : 'bg-gray-500/20 text-gray-400'}`}>
                {form.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="card mb-6">
            <h2 className="font-bold mb-4 text-cyan">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input className="input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
                <select className="input" value={form.difficulty} onChange={e => setForm(p => ({...p, difficulty: e.target.value}))}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Total Points</label>
                <input type="number" className="input" value={form.totalPoints} onChange={e => setForm(p => ({...p, totalPoints: +e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Languages</label>
                <div className="flex gap-2 flex-wrap">
                  {['cpp','python','java','javascript','c'].map(l => (
                    <button key={l} type="button" onClick={() => toggleLang(l)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${form.languages?.includes(l) ? 'border-cyan bg-cyan/10 text-cyan' : 'border-white/20 text-gray-400'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="card mb-6">
            <h2 className="font-bold mb-4 text-cyan">Problem Statement</h2>
            <textarea className="input resize-none mb-4" rows={6} value={form.problemStatement} onChange={e => setForm(p => ({...p, problemStatement: e.target.value}))} />
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sample Input</label>
                <textarea className="input font-mono text-sm resize-none" rows={2} value={form.sampleInput || ''} onChange={e => setForm(p => ({...p, sampleInput: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sample Output</label>
                <textarea className="input font-mono text-sm resize-none" rows={2} value={form.sampleOutput || ''} onChange={e => setForm(p => ({...p, sampleOutput: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Test Cases */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-cyan">Test Cases ({testCases.length})</h2>
              <div className="flex gap-2">
                <button onClick={generateTests} disabled={generating}
                  className="flex items-center gap-1.5 bg-purple/20 hover:bg-purple/30 text-purple px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                  <Brain className="w-4 h-4" />{generating ? 'Generating…' : 'AI Generate'}
                </button>
                <button onClick={addTC} className="flex items-center gap-1.5 bg-cyan/10 hover:bg-cyan/20 text-cyan px-3 py-1.5 rounded-lg text-sm transition-all">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {testCases.map((tc, i) => (
                <div key={i} className="bg-navy-light rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-400">Test {i+1}</span>
                      <select value={tc.type} onChange={e => updateTC(i, 'type', e.target.value)}
                        className="bg-navy-2 border border-white/20 rounded px-2 py-0.5 text-xs text-gray-400">
                        {['basic','edge','stress','boundary','random','hidden'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={tc.isHidden || false} onChange={e => updateTC(i, 'isHidden', e.target.checked)} />Hidden
                      </label>
                    </div>
                    <button onClick={() => removeTC(i)} className="text-gray-500 hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <textarea className="input font-mono text-xs resize-none" rows={2} placeholder="Input" value={tc.input} onChange={e => updateTC(i, 'input', e.target.value)} />
                    <textarea className="input font-mono text-xs resize-none" rows={2} placeholder="Expected Output" value={tc.expectedOutput} onChange={e => updateTC(i, 'expectedOutput', e.target.value)} />
                  </div>
                </div>
              ))}
              {testCases.length === 0 && <p className="text-gray-500 text-sm text-center py-6">No test cases yet. Add manually or use AI Generate.</p>}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => handleSave(false)} disabled={saving} className="btn-outline flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary flex items-center gap-2">
              <Eye className="w-4 h-4" />{saving ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
