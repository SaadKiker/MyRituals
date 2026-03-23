"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "../lib/supabase"
import ThemeToggle from "../components/ThemeToggle"
import { useTheme } from "../context/ThemeContext"

export default function LoginPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push("/goals")
    }
  }

  return (
    <div style={{
      height: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--t-bg)",
      fontFamily: "var(--font-rubik), sans-serif",
    }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", flexShrink: 0 }}>
        <Link href="/">
          <Image src={theme === "girl" ? "/logoP.png" : "/logo.png"} alt="MyRituals" width={148} height={37} style={{ objectFit: "contain" }} priority />
        </Link>
        <ThemeToggle />
      </nav>

      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px 40px" }}>
        <div style={{ width: "100%", maxWidth: "360px" }}>

          <h1 style={{
            fontSize: "1.75rem", fontWeight: 800, color: "var(--t-heading)",
            letterSpacing: "-0.03em", margin: "0 0 6px", textAlign: "center",
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--t-muted)", margin: "0 0 28px", textAlign: "center" }}>
            Sign in to your account
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
            {error && <p style={{ fontSize: "0.82rem", color: "#c0392b", margin: "0" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{
              marginTop: "4px",
              padding: "13px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "var(--t-primary)",
              color: "#fff",
              fontSize: "0.92rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p style={{ marginTop: "20px", fontSize: "0.88rem", color: "var(--t-muted)", textAlign: "center" }}>
            No account?{" "}
            <Link href="/signup" style={{ color: "var(--t-primary)", fontWeight: 600, textDecoration: "none" }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "12px",
  border: "1.5px solid var(--t-input-border)",
  backgroundColor: "rgba(255,255,255,0.5)",
  fontSize: "0.95rem",
  color: "var(--t-primary)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-rubik), sans-serif",
}
