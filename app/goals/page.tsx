"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../lib/supabase"
import GoalSet, { type GoalSetType } from "../components/GoalSet"
import type { User } from "@supabase/supabase-js"

export default function GoalsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [goalSets, setGoalSets] = useState<GoalSetType[]>([])
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login")
        return
      }

      setUser(session.user)

      const { data: sets } = await supabase
        .from("goal_sets")
        .select("*")
        .eq("user_id", session.user.id)
        .order("sort_order", { ascending: true })

      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", session.user.id)
        .order("sort_order", { ascending: true })

      const combined: GoalSetType[] = (sets ?? []).map((s) => ({
        ...s,
        goals: (goals ?? []).filter((g) => g.goal_set_id === s.id),
      }))

      if (combined.length === 0) {
        // Create a default set for new users
        const { data: newSet } = await supabase
          .from("goal_sets")
          .insert({ user_id: session.user.id, title: "", target_date: null, sort_order: 0 })
          .select()
          .single()

        if (newSet) {
          const { data: newGoal } = await supabase
            .from("goals")
            .insert({
              goal_set_id: newSet.id,
              user_id: session.user.id,
              title: "",
              current_value: 0,
              target_value: 10,
              sort_order: 0,
            })
            .select()
            .single()

          setGoalSets([{ ...newSet, goals: newGoal ? [newGoal] : [] }])
        }
      } else {
        setGoalSets(combined)
      }

      setLoading(false)
    })
  }, [router])

  async function addGoalSet() {
    if (!user) return
    const newSortOrder = goalSets.length
    const { data: newSet } = await supabase
      .from("goal_sets")
      .insert({ user_id: user.id, title: "", target_date: null, sort_order: newSortOrder })
      .select()
      .single()

    if (newSet) {
      const { data: newGoal } = await supabase
        .from("goals")
        .insert({
          goal_set_id: newSet.id,
          user_id: user.id,
          title: "",
          current_value: 0,
          target_value: 10,
          sort_order: 0,
        })
        .select()
        .single()

      setGoalSets((prev) => [...prev, { ...newSet, goals: newGoal ? [newGoal] : [] }])
    }
  }

  function handleSetDelete(setId: string) {
    const remaining = goalSets.filter((s) => s.id !== setId)
    setGoalSets(remaining)
    if (remaining.length === 0) {
      addGoalSet()
    }
  }

  function handleSetUpdate(updated: GoalSetType) {
    setGoalSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading) return null

  return (
    <>
      <style>{`
        .goal-card:hover .goal-delete-btn {
          opacity: 1 !important;
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#b0d2e3",
          fontFamily: "var(--font-rubik), sans-serif",
          padding: "0 0 60px",
        }}
      >
        {/* Floating Nav */}
        <span style={{ position: "fixed", top: 16, left: 20, fontWeight: 700, fontSize: "1.1rem", color: "#2f6690", zIndex: 100, pointerEvents: "none" }}>MyRituals</span>
        <button
          onClick={handleLogout}
          style={{ position: "fixed", top: 10, right: 14, background: "transparent", border: "none", cursor: "pointer", color: "#5a7a99", padding: 6, zIndex: 100 }}
          title="Sign out"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>

        {/* Tab Bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "52px 24px 0" }}>
          <div
            style={{
              background: "rgba(26,46,69,0.1)",
              borderRadius: 12,
              padding: 4,
              display: "flex",
              gap: 2,
            }}
          >
            {[
              { label: "Goals", href: "/goals" },
              { label: "Daily", href: "/daily" },
              { label: "Schedule", href: "/schedule" },
            ].map(({ label, href }) => {
              const active = label === "Goals"
              return (
                <Link
                  key={label}
                  href={href}
                  style={{
                    padding: "8px 24px",
                    borderRadius: 8,
                    background: active ? "rgba(26,46,69,0.15)" : "transparent",
                    color: active ? "#1a2e45" : "#5a7a99",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    textDecoration: "none",
                    boxShadow: active ? "0 2px 8px rgba(26,46,69,0.1)" : "none",
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

        {/* Content */}
        <div
          style={{
            maxWidth: 760,
            margin: "32px auto 0",
            padding: "0 20px",
          }}
        >
          {goalSets.map((set) => (
            <GoalSet
              key={set.id}
              goalSet={set}
              userId={user!.id}
              onDelete={handleSetDelete}
              onUpdate={handleSetUpdate}
            />
          ))}

          {/* Add New Set Button */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <button
              onClick={addGoalSet}
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                border: "2px dashed rgba(26,46,69,0.25)",
                background: "transparent",
                color: "#5a7a99",
                fontSize: 24,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#1a2e45"
                ;(e.currentTarget as HTMLButtonElement).style.color = "#1a2e45"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(26,46,69,0.25)"
                ;(e.currentTarget as HTMLButtonElement).style.color = "#5a7a99"
              }}
              title="Add Goal Set"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
