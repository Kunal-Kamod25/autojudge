"use client"
import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Clock, Terminal, AlertCircle } from 'lucide-react'

function StatusBadge({ status }) {
  if (status === 'PASSED') return (
    <span className="flex items-center gap-1 text-xs font-bold text-success">
      <CheckCircle className="w-3.5 h-3.5" /> PASSED
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-danger">
      <XCircle className="w-3.5 h-3.5" /> FAILED
    </span>
  )
}

function GTestItem({ test, index }) {
  const [open, setOpen] = useState(test.status === 'FAILED')
  const passed = test.status === 'PASSED'

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${passed ? 'border-success/20 bg-success/3' : 'border-danger/25 bg-danger/5'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${passed ? 'hover:bg-success/5' : 'hover:bg-danger/5'}`}
      >
        <StatusBadge status={test.status} />
        <div className="flex-1 min-w-0">
          <span className="text-xs text-gray-500">{test.suite}.</span>
          <span className="text-sm font-mono font-medium text-white">{test.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test.duration}ms</span>
          {test.status === 'FAILED' && (
            open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {open && test.failure_message && (
        <div className="px-4 pb-3 pt-0 border-t border-danger/15">
          <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-danger" /> Failure Details
          </div>
          <pre className="text-xs font-mono text-danger/90 bg-danger/5 rounded p-2.5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {test.failure_message}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function GTestResultPanel({ gtestData, rawOutput }) {
  const [tab, setTab] = useState('tests')

  if (!gtestData && !rawOutput) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No GTest results available
      </div>
    )
  }

  const { summary, tests } = gtestData || { summary: { total: 0, passed: 0, failed: 0, duration: 0 }, tests: [] }
  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* GTest header banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-navy-2 border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-cyan/10 text-cyan border-cyan/30">
            Google Test
          </span>
        </div>
        <div className="flex-1 flex items-center gap-4 text-sm">
          <span className="text-success font-bold">{summary.passed} passed</span>
          {summary.failed > 0 && <span className="text-danger font-bold">{summary.failed} failed</span>}
          <span className="text-gray-500">{summary.total} total</span>
          {summary.duration > 0 && <span className="text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{summary.duration}ms</span>}
        </div>
        {/* Pass rate bar */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${passRate}%`, background: passRate === 100 ? '#22c55e' : passRate > 50 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <span className="text-xs text-gray-400">{passRate}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[['tests', 'Test Cases'], ['output', 'Raw Output']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-cyan text-cyan' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {label}
            {key === 'tests' && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${summary.failed > 0 ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
              {summary.passed}/{summary.total}
            </span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'tests' ? (
        <div className="space-y-2">
          {tests.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No individual test cases found. Check raw output.
            </div>
          ) : (
            tests.map((t, i) => <GTestItem key={i} test={t} index={i} />)
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-navy-2 border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-navy">
            <Terminal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">GTest Output</span>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-300 overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap">
            {rawOutput || 'No output captured'}
          </pre>
        </div>
      )}
    </div>
  )
}
