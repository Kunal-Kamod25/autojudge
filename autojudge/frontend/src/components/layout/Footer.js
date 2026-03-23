"use client"
// This file drives the Footer feature flow and keeps the behavior easy to reason about.
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Code2, Github, Twitter, Linkedin, Mail, Heart, Zap, BookOpen, Trophy, Shield } from 'lucide-react'
import api from '@/lib/api'

const footerLinks = {
  Platform: [
    { label: 'Practice Problems', href: '/practice', icon: BookOpen },
    { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { label: 'Get Started', href: '/auth/register', icon: Zap },
    { label: 'Sign In', href: '/auth/login', icon: Shield },
  ],
  Resources: [
    { label: 'C++ Problems', href: '/practice' },
    { label: 'Python Problems', href: '/practice' },
    { label: 'Java Problems', href: '/practice' },
    { label: 'JavaScript Problems', href: '/practice' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: 'mailto:support@autojudge.dev' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

const socialLinks = [
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:support@autojudge.dev', label: 'Email' },
]

// Footer handles one focused part of this file's workflow.
export default function Footer() {
  const [stats, setStats] = useState([
    { value: '0', label: 'Students' },
    { value: '0', label: 'Problems' },
    { value: '0', label: 'Submissions' },
    { value: '5', label: 'Languages' },
  ])

  useEffect(() => {
    api.get('/api/stats').then(({ data }) => {
      if (data.stats) setStats([
        { value: String(data.stats.students), label: 'Students' },
        { value: String(data.stats.problems), label: 'Problems' },
        { value: String(data.stats.submissions), label: 'Submissions' },
        { value: String(data.stats.languages), label: 'Languages' },
      ])
    }).catch(() => {})
  }, [])

  return (
    <footer className="relative border-t border-white/10 bg-navy-2/50 backdrop-blur-sm">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent" />

      {/* Stats banner */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-black text-cyan">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 bg-cyan rounded-xl flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(0,180,216,0.4)] transition-shadow">
                <Code2 className="w-5 h-5 text-navy" />
              </div>
              <span className="font-black text-xl">Auto<span className="text-cyan">Judge</span></span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
              AI-powered code testing platform. Submit your code, get instant feedback
              with 500+ test cases, detailed PDF reports, and plagiarism detection.
              Built for students and teachers.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((s, i) => (
                <a key={i} href={s.href} aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-cyan hover:border-cyan/30 hover:bg-cyan/10 transition-all">
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan transition-colors group">
                      {link.icon && <link.icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} AutoJudge. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            Built with <Heart className="w-3.5 h-3.5 text-danger fill-danger" /> using Next.js, Node.js, MongoDB &amp; AI
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
