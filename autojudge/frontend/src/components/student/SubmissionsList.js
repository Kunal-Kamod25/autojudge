"use client"
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { FileText, Download, Filter, Search, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { submissionApi } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'

const V_COLORS = { AC:'#00C896', WA:'#FF5A5F', TLE:'#FF9E00', MLE:'#B388FF', RE:'#FF5A5F', CE:'#90A4AE', PENDING:'#60A5FA' }
const LANGS = ['', 'cpp', 'python', 'java', 'javascript', 'c']

export default function SubmissionsPage() {
  const [subs, setSubs] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [lang, setLang] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (p = 1) => {
    setLoading(true)
    submissionApi.getMySubmissions({ page: p, limit: 15, language: lang || undefined })
      .then(r => { setSubs(r.data.submissions); setTotal(r.data.total); setPages(r.data.pages) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page, lang])

  const downloadPDF = async (id, e) => {
    e.preventDefault()
    try {
      const res = await submissionApi.downloadPDF(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `report_${id}.pdf`; a.click()
    } catch(e) {}
  }

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Submission History</h1>
            <p className="text-gray-400 mt-1">{total} total submissions</p>
          </div>
          <select value={lang} onChange={e => { setLang(e.target.value); setPage(1) }}
            className="input w-36 text-sm">
            <option value="">All Languages</option>
            {['cpp','python','java','javascript','c'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full" /></div>
        ) : (
          <>
            <div className="card p-0 overflow-hidden mb-6">
              <table className="w-full">
                <thead><tr className="border-b border-white/10 bg-navy-2">
                  {['Assignment','Language','Verdict','Score','Tests','Time',''].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium uppercase px-4 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {subs.map((s, i) => (
                    <motion.tr key={s._id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.03 }}
                      className="border-b border-white/5 hover:bg-navy-2/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/student/submissions/${s._id}`} className="font-medium text-sm hover:text-cyan transition-colors">
                          {s.assignment?.title || 'Practice Problem'}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{new Date(s.createdAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs uppercase text-gray-400 font-mono">{s.language}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-black px-2 py-1 rounded" style={{ background: (V_COLORS[s.verdict] || '#90A4AE')+'20', color: V_COLORS[s.verdict] || '#90A4AE' }}>
                          {s.verdict || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{s.score || 0}<span className="text-gray-500">/{s.totalScore || 100}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-400">{s.passedTests || 0}/{s.totalTests || 0}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.executionTime ? `${s.executionTime}ms` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/student/submissions/${s._id}`} className="text-cyan hover:underline text-xs">View</Link>
                          <button onClick={e => downloadPDF(s._id, e)} className="text-gray-400 hover:text-white" title="Download PDF">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {subs.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-gray-500 py-12 text-sm">No submissions yet. Start solving problems!</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 text-gray-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: pages }, (_, i) => i+1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-cyan text-navy' : 'text-gray-400 hover:bg-white/5'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 text-gray-400">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
