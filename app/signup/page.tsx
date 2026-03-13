"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../lib/supabase"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
    } else {
      router.push("/goals")
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>MyRituals</h1>
        <p style={styles.subtitle}>Create your account</p>
        <form onSubmit={handleSignup} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p style={styles.switchText}>
          Already have an account?{" "}
          <Link href="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
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
    margin: "0 0 6px",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#3a6080",
    margin: "0 0 28px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1.5px solid #c8dfe9",
    backgroundColor: "#f0f8fc",
    fontSize: "0.95rem",
    color: "#1a2e45",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "4px",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#1a2e45",
    color: "#fff",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  error: {
    fontSize: "0.85rem",
    color: "#c0392b",
    margin: "0",
  },
  switchText: {
    marginTop: "20px",
    fontSize: "0.88rem",
    color: "#3a6080",
  },
  link: {
    color: "#1a2e45",
    fontWeight: 600,
    textDecoration: "none",
  },
}
