"use client"
// This file drives the NewAssignment feature flow and keeps the behavior easy to reason about.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Brain, Plus, Trash2, ChevronDown } from 'lucide-react'
import { assignmentApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'

const DEFAULT_TC = { input: '', expectedOutput: '', type: 'basic', timeLimit: 2000, points: 10, isHidden: false }

// NewAssignmentPage handles one focused part of this file's workflow.
export default function NewAssignmentPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', description: '', problemStatement: '', difficulty: 'medium',
    languages: ['cpp', 'python'], dueDate: '', constraints: '', sampleInput: '', sampleOutput: '',
    totalPoints: 100, isPublished: false
  })
  const [testCases, setTestCases] = useState([{ ...DEFAULT_TC }])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // addTestCase handles one focused part of this file's workflow.
  const addTestCase = () => setTestCases(p => [...p, { ...DEFAULT_TC }])
  // removeTC handles one focused part of this file's workflow.
  const removeTC = (i) => setTestCases(p => p.filter((_, idx) => idx !== i))
  // updateTC handles one focused part of this file's workflow.
  const updateTC = (i, k, v) => setTestCases(p => p.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc))

  // toggleLang handles one focused part of this file's workflow.
  const toggleLang = (lang) => {
    setForm(p => ({
      ...p,
      languages: p.languages.includes(lang) ? p.languages.filter(l => l !== lang) : [...p.languages, lang]
    }))
  }

  // generateTests handles one focused part of this file's workflow.
  const generateTests = async () => {
    // Quick guard clause so we fail fast before doing heavier work.
    if (!form.problemStatement) return toast.error('Add problem statement first')
    setGenerating(true)
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      const saved = await assignmentApi.create({ ...form, testCases: [] })
      const res = await assignmentApi.generateTests(saved.data.assignment._id, { language: form.languages[0], count: 20 })
      setTestCases(res.data.testCases)
      toast.success(`Generated ${res.data.testCases.length} AI test cases!`)
      router.push(`/teacher/assignments/${saved.data.assignment._id}/edit`)
    } catch(e) {
      toast.error('Generation failed')
    } finally { setGenerating(false) }
  }

  // handleSave handles one focused part of this file's workflow.
  const handleSave = async (publish = false) => {
    setSaving(true)
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      await assignmentApi.create({ ...form, testCases, isPublished: publish })
      toast.success(publish ? 'Assignment published!' : 'Assignment saved as draft')
      router.push('/teacher/dashboard')
    } catch(e) {
      toast.error(e.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black mb-8">Create New Assignment</h1>

          {/* Basic Info */}
          <div className="card mb-6">
            <h2 className="font-bold mb-4 text-cyan">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Title *</label>
                <input className="input" placeholder="e.g. Two Sum Problem" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea className="input resize-none" rows={2} placeholder="Brief description for students" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
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
                <label className="block text-sm text-gray-400 mb-2">Allowed Languages</label>
                <div className="flex gap-2 flex-wrap">
                  {['cpp','python','java','javascript','c'].map(l => (
                    <button key={l} type="button" onClick={() => toggleLang(l)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${form.languages.includes(l) ? 'border-cyan bg-cyan/10 text-cyan' : 'border-white/20 text-gray-400'}`}>
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
            <textarea className="input resize-none mb-4" rows={8} placeholder="Describe the problem in detail. Include what the input/output format is, constraints, and examples." value={form.problemStatement} onChange={e => setForm(p => ({...p, problemStatement: e.target.value}))} />
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sample Input</label>
                <textarea className="input font-mono text-sm resize-none" rows={3} placeholder="5 3" value={form.sampleInput} onChange={e => setForm(p => ({...p, sampleInput: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sample Output</label>
                <textarea className="input font-mono text-sm resize-none" rows={3} placeholder="8" value={form.sampleOutput} onChange={e => setForm(p => ({...p, sampleOutput: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Constraints</label>
                <input className="input" placeholder="1 ≤ n ≤ 10^5, -10^9 ≤ a[i] ≤ 10^9" value={form.constraints} onChange={e => setForm(p => ({...p, constraints: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Test Cases */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-cyan">Test Cases ({testCases.length})</h2>
              <div className="flex gap-2">
                <button onClick={generateTests} disabled={generating}
                  className="flex items-center gap-2 bg-purple/20 hover:bg-purple/30 text-purple px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                  <Brain className="w-4 h-4" />
                  {generating ? 'Generating...' : 'AI Generate 20 Tests'}
                </button>
                <button onClick={addTestCase} className="flex items-center gap-1.5 bg-cyan/10 hover:bg-cyan/20 text-cyan px-3 py-1.5 rounded-lg text-sm transition-all">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {testCases.map((tc, i) => (
                <div key={i} className="bg-navy-light rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Test {i+1}</span>
                      <select value={tc.type} onChange={e => updateTC(i, 'type', e.target.value)}
                        className="bg-navy-2 border border-white/20 rounded px-2 py-0.5 text-xs text-gray-400">
                        {['basic','edge','stress','boundary','random','hidden'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={tc.isHidden} onChange={e => updateTC(i, 'isHidden', e.target.checked)} className="rounded" />
                        Hidden
                      </label>
                    </div>
                    <button onClick={() => removeTC(i)} className="text-gray-500 hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Input</label>
                      <textarea className="input font-mono text-xs resize-none" rows={2} value={tc.input} onChange={e => updateTC(i, 'input', e.target.value)} placeholder="Test input" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Expected Output</label>
                      <textarea className="input font-mono text-xs resize-none" rows={2} value={tc.expectedOutput} onChange={e => updateTC(i, 'expectedOutput', e.target.value)} placeholder="Expected output" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button onClick={() => handleSave(false)} disabled={saving} className="btn-outline">
              Save as Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
