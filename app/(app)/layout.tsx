"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"
import { useTheme } from "../context/ThemeContext"

const UserContext = createContext<User | null>(null)
export function useAppUser() {
  const u = useContext(UserContext)
  if (!u) throw new Error("useAppUser used outside AppLayout")
  return u
}

const TABS = [
  { label: "Goals", href: "/goals" },
  { label: "Habits", href: "/daily" },
  { label: "Schedule", href: "/schedule" },
] as const

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return }
      setUser(session.user)
      setLoading(false)
    })
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading) return null

  return (
    <UserContext.Provider value={user}>
      <div style={{ minHeight: "100vh", backgroundColor: "var(--t-bg)", fontFamily: "var(--font-rubik), sans-serif", padding: "0 0 60px", fontSize: "1.125rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
          <Image src={theme === "girl" ? "/logoP.png" : "/logo.png"} alt="MyRituals" height={40} width={160} style={{ objectFit: "contain" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Boy / Girl toggle */}
            <div
              onClick={toggle}
              title={`Switch to ${theme === "boy" ? "girl" : "boy"} theme`}
              style={{
                display: "flex", alignItems: "center",
                background: "var(--t-p10)", border: "1.5px solid var(--t-p25)",
                borderRadius: 20, padding: "3px 4px", cursor: "pointer", gap: 2,
              }}
            >
              {(["boy", "girl"] as const).map((t) => (
                <div key={t} style={{
                  padding: "3px 9px", borderRadius: 14, fontWeight: 700, fontSize: "0.75rem",
                  background: theme === t ? "var(--t-primary)" : "transparent",
                  color: theme === t ? "#fff" : "var(--t-muted)",
                  transition: "all 0.25s",
                }}>
                  {t === "boy" ? "♂" : "♀"}
                </div>
              ))}
            </div>
            {/* Logout */}
            <button onClick={handleLogout} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--t-muted)", padding: 6 }} title="Sign out">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="app-tab-wrapper">
          <div className="app-tabs">
            {TABS.map(({ label, href }) => {
              const active = pathname === href
              return (
                <Link key={label} href={href} className="app-tab" style={{
                  background: active ? "var(--t-p15)" : "transparent",
                  color: active ? "var(--t-primary)" : "var(--t-muted)",
                  boxShadow: active ? "0 2px 8px var(--t-p10)" : "none",
                  pointerEvents: "auto", opacity: 1,
                }}>
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        {children}
      </div>
    </UserContext.Provider>
  )
}
