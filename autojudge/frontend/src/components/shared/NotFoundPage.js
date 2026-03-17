"use client"
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Code2, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-6">
      <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} className="text-center max-w-md">
        <div className="text-8xl font-black gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold mb-3">Page Not Found</h1>
        <p className="text-gray-400 mb-8">Looks like this page compiled with errors. Let's get you back on track.</p>
        <pre className="bg-navy-2 rounded-xl p-4 text-left text-sm font-mono text-danger mb-8">
          error: cannot find page '/that-url'
          note: did you mean '/'?
        </pre>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <Home className="w-4 h-4" /> Back to Home
        </Link>
      </motion.div>
    </div>
  )
}
