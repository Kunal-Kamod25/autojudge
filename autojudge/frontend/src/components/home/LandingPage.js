"use client"
// This file drives the LandingPage feature flow and keeps the behavior easy to reason about.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Code2, Zap, Shield, Trophy, Brain, FileDown, Github, ChevronRight, CheckCircle, Star, Users, BookOpen } from 'lucide-react'
import Footer from '@/components/layout/Footer'
import api from '@/lib/api'

const FEATURES = [
  { icon: Brain, title: 'AI Test Generation', desc: 'Claude, Gemini & Groq generate 500+ diverse test cases automatically from your problem statement.', color: 'text-cyan', bg: 'bg-cyan/10' },
  { icon: Zap, title: 'Real-time Grading', desc: 'Code runs in isolated sandboxes. Get AC, WA, TLE, MLE, RE verdicts in seconds.', color: 'text-success', bg: 'bg-success/10' },
  { icon: FileDown, title: 'PDF Reports', desc: 'Every submission generates a detailed PDF — bugs found, improvements, complexity analysis.', color: 'text-warning', bg: 'bg-warning/10' },
  { icon: Shield, title: 'Plagiarism Detection', desc: 'AI-powered code similarity detection flags copied submissions instantly.', color: 'text-danger', bg: 'bg-danger/10' },
  { icon: Trophy, title: 'LeetCode-Style Testing', desc: 'Basic, edge, stress, boundary & random test cases — just like real competitive platforms.', color: 'text-purple', bg: 'bg-purple/10' },
  { icon: Github, title: 'File & Folder Upload', desc: 'Upload single files, .zip archives, or entire project folders. We extract the code automatically.', color: 'text-cyan', bg: 'bg-cyan/10' },
]

const LANGS = ['C++', 'Python', 'Java', 'JavaScript', 'C']
const VERDICTS = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE']
const VERDICT_COLORS = { AC: '#00C896', WA: '#FF5A5F', TLE: '#FF9E00', MLE: '#B388FF', RE: '#FF5A5F', CE: '#90A4AE' }

// LandingPage handles one focused part of this file's workflow.
export default function LandingPage() {
  const [currentLang, setCurrentLang] = useState(0)
  const [typed, setTyped] = useState('')
  const [platformStats, setPlatformStats] = useState({ students: 0, submissions: 0, problems: 0, languages: 5 })
  const [mounted, setMounted] = useState(false)
  const particles = useMemo(() => mounted ? Array.from({ length: 20 }, (_, i) => ({
    id: i, size: Math.random() * 60 + 10,
    x: Math.random() * 100, y: Math.random() * 100,
    delay: Math.random() * 4, duration: Math.random() * 4 + 4
  })) : [], [mounted])
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, -100])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])

  const CODE_DEMO = `// C++ — Two Sum Problem
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement))
            return {seen[complement], i};
        seen[nums[i]] = i;
    }
    return {};
}`

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      setTyped(CODE_DEMO.slice(0, i))
      i++
      if (i > CODE_DEMO.length) clearInterval(timer)
    }, 18)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setCurrentLang(p => (p + 1) % LANGS.length), 2000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    api.get('/api/stats').then(({ data }) => {
      if (data.stats) setPlatformStats(data.stats)
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-navy hero-pattern overflow-hidden">
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <motion.div key={p.id} className="particle absolute rounded-full"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%`, background: 'rgba(0,180,216,0.06)' }}
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-cyan/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5 text-navy" />
            </div>
            <span className="font-black text-xl text-white">Auto<span className="text-cyan">Judge</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-cyan transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-cyan transition-colors">How it Works</a>
            <a href="#practice" className="hover:text-cyan transition-colors">Practice</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-outline text-sm py-2">Login</Link>
            <Link href="/auth/register" className="btn-primary text-sm py-2">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <motion.section style={{ y: heroY, opacity: heroOpacity }} className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-cyan/10 border border-cyan/30 rounded-full px-4 py-1.5 mb-8 text-sm text-cyan">
              <Zap className="w-3.5 h-3.5" />
              <span>Powered by Gemini AI + Groq + Llama3</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              Code Smarter.<br />
              <span className="gradient-text">Grade Faster.</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-4">
              Submit your code in{' '}
              <motion.span key={currentLang} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="text-cyan font-bold" transition={{ duration: 0.3 }}>
                {LANGS[currentLang]}
              </motion.span>
              {' '}and get instant AI-powered feedback, 500+ test cases, and a detailed PDF report.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link href="/auth/register" className="btn-primary flex items-center gap-2 text-lg px-8 py-3">
                Start Coding Free <ChevronRight className="w-5 h-5" />
              </Link>
              <Link href="/practice" className="btn-outline flex items-center gap-2 text-lg px-8 py-3">
                Try Practice <Code2 className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-16">
            {[
              { label: 'Students', value: platformStats.students, icon: Users },
              { label: 'Problems', value: platformStats.problems, icon: BookOpen },
              { label: 'Submissions', value: platformStats.submissions, icon: Code2 },
              { label: 'Languages', value: platformStats.languages, icon: Star },
            ].map((s, i) => (
              <div key={i} className="card text-center py-4">
                <div className="text-2xl font-black text-cyan">{s.value}</div>
                <div className="text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Code Demo */}
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
            className="mt-16 max-w-4xl mx-auto">
            <div className="glass rounded-2xl overflow-hidden glow">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-navy-2">
                <div className="w-3 h-3 rounded-full bg-danger"></div>
                <div className="w-3 h-3 rounded-full bg-warning"></div>
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span className="ml-3 text-gray-400 text-sm font-mono">solution.cpp</span>
                <div className="ml-auto flex gap-2">
                  {VERDICTS.map(v => (
                    <span key={v} className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: VERDICT_COLORS[v], background: VERDICT_COLORS[v] + '20' }}>{v}</span>
                  ))}
                </div>
              </div>
              <pre className="text-left p-6 text-sm font-mono text-green-400 overflow-x-auto min-h-[200px]">
                <code>{typed}<span className="animate-pulse text-cyan">|</span></code>
              </pre>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Everything You Need</h2>
            <p className="text-gray-400 text-lg">Built for students and teachers who want real results</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="card glow-hover group cursor-default">
                <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 bg-navy-2/30">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">How It Works</h2>
          </motion.div>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            {['Submit Code or File', 'AI Runs 500+ Tests', 'Get Verdict & Score', 'Download PDF Report'].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="flex items-center gap-4">
                <div className="text-center">
                  <div className="w-14 h-14 bg-cyan rounded-2xl flex items-center justify-center text-navy font-black text-xl mb-3 mx-auto animate-pulse-glow">
                    {i + 1}
                  </div>
                  <div className="text-sm font-medium max-w-[120px] text-center">{step}</div>
                </div>
                {i < 3 && <ChevronRight className="w-6 h-6 text-cyan hidden md:block flex-shrink-0" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 glow">
          <h2 className="text-4xl font-black mb-4">Ready to Start?</h2>
          <p className="text-gray-400 mb-8">Join students and teachers already using AutoJudge</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/register?role=student" className="btn-primary flex items-center gap-2 px-8 py-3">
              <Users className="w-5 h-5" /> I am a Student
            </Link>
            <Link href="/auth/register?role=teacher" className="btn-outline flex items-center gap-2 px-8 py-3">
              <BookOpen className="w-5 h-5" /> I am a Teacher
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
