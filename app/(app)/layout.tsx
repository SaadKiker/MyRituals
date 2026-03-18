"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login")
        return
      }
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
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#b0d2e3",
          fontFamily: "var(--font-rubik), sans-serif",
          padding: "0 0 60px",
          fontSize: "1.125rem",
        }}
      >
        {/* Floating Nav - persistent across Goals / Daily / Schedule */}
        <div
          style={{
            position: "fixed",
            top: 10,
            left: 20,
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <Image src="/logo.png" alt="MyRituals" height={40} width={160} style={{ objectFit: "contain" }} />
        </div>
        <button
          onClick={handleLogout}
          style={{
            position: "fixed",
            top: 10,
            right: 14,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#5a7a99",
            padding: 6,
            zIndex: 100,
          }}
          title="Sign out"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>

        {/* Tab Bar - persistent across Goals / Daily / Schedule */}
        <div style={{ display: "flex", justifyContent: "center", padding: "52px 24px 0" }}>
          <div
            style={{
              background: "rgba(47,102,144,0.1)",
              borderRadius: 12,
              padding: 4,
              display: "flex",
              gap: 2,
            }}
          >
            {TABS.map(({ label, href }) => {
              const active = pathname === href
              return (
                <Link
                  key={label}
                  href={href}
                  style={{
                    padding: "10px 26px",
                    borderRadius: 8,
                    background: active ? "rgba(47,102,144,0.15)" : "transparent",
                    color: active ? "#2f6690" : "#5a7a99",
                    fontWeight: 600,
                    fontSize: "1rem",
                    textDecoration: "none",
                    boxShadow: active ? "0 2px 8px rgba(47,102,144,0.1)" : "none",
                    pointerEvents: "auto",
                    opacity: 1,
                  }}
                >
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
