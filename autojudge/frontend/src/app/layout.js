// This file drives the layout feature flow and keeps the behavior easy to reason about.
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'AutoJudge — AI Code Testing Platform',
  description: 'Submit code, get instant AI feedback, and improve your programming skills',
  icons: { icon: '/favicon.ico' }
}

// RootLayout handles one focused part of this file's workflow.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-navy text-white antialiased">
        {children}
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1B2B3B', color: '#fff', border: '1px solid rgba(0,180,216,0.3)' },
          success: { iconTheme: { primary: '#00C896', secondary: '#fff' } },
          error: { iconTheme: { primary: '#FF5A5F', secondary: '#fff' } }
        }} />
      </body>
    </html>
  )
}
