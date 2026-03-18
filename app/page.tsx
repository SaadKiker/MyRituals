"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "./lib/supabase"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/goals")
    })
  }, [router])

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <Image src="/logo.png" alt="MyRituals" width={260} height={65} style={{ objectFit: "contain" }} />
        </div>
        <p style={styles.subtitle}>
          Build habits, schedule your day, reach your goals.
        </p>
        <div style={styles.actions}>
          <Link href="/signup" style={styles.primaryBtn}>
            Get started
          </Link>
          <Link href="/login" style={styles.secondaryBtn}>
            Sign in
          </Link>
        </div>
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
    maxWidth: "420px",
    textAlign: "center",
  },
  title: {
    fontSize: "clamp(2rem, 8vw, 3rem)",
    fontWeight: 700,
    color: "#2f6690",
    letterSpacing: "-0.02em",
    margin: "0 0 12px",
  },
  subtitle: {
    fontSize: "clamp(0.95rem, 3vw, 1.05rem)",
    color: "#3a6080",
    margin: "0 0 32px",
    lineHeight: 1.6,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  primaryBtn: {
    display: "block",
    padding: "13px",
    borderRadius: "10px",
    backgroundColor: "#2f6690",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    textDecoration: "none",
  },
  secondaryBtn: {
    display: "block",
    padding: "13px",
    borderRadius: "10px",
    backgroundColor: "transparent",
    border: "1.5px solid #2f6690",
    color: "#2f6690",
    fontWeight: 600,
    fontSize: "0.95rem",
    textDecoration: "none",
  },
}
