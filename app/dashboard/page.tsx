"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login")
      } else {
        router.replace("/goals")
      }
    })
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading) return null

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>MyRituals</h1>
        <p style={styles.email}>{user?.email}</p>
        <button onClick={handleLogout} style={styles.button}>
          Sign out
        </button>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b0d2e3",
    padding: "24px",
    fontFamily: "var(--font-rubik), sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "380px",
    textAlign: "center",
  },
  title: {
    fontSize: "clamp(1.8rem, 6vw, 2.4rem)",
    fontWeight: 700,
    color: "#1a2e45",
    letterSpacing: "-0.02em",
    margin: "0 0 8px",
  },
  email: {
    fontSize: "0.9rem",
    color: "#3a6080",
    margin: "0 0 28px",
  },
  button: {
    padding: "12px 28px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#1a2e45",
    color: "#fff",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
}
