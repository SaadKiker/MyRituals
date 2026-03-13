"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../lib/supabase"
import HabitList from "../components/HabitList"
import type { Habit, HabitEntry } from "../components/HabitItem"
import type { User } from "@supabase/supabase-js"

function getToday() {
  return new Date().toISOString().split("T")[0]
}

export default function DailyPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const today = getToday()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login")
        return
      }

      setUser(session.user)

      const [{ data: habitsData }, { data: entriesData }] = await Promise.all([
        supabase
          .from("habits")
          .select("*")
          .eq("user_id", session.user.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("habit_entries")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("entry_date", today),
      ])

      setHabits((habitsData as Habit[]) ?? [])
      setEntries((entriesData as HabitEntry[]) ?? [])
      setLoading(false)
    })
  }, [router, today])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading) return null

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <>
      <style>{`
        .habit-row:hover .habit-del-btn {
          opacity: 1 !important;
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#b0d2e3",
          fontFamily: "var(--font-rubik), sans-serif",
          paddingBottom: 60,
        }}
      >
        {/* Top Nav */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: "1px solid rgba(26,46,69,0.1)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1a2e45" }}>MyRituals</span>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "none",
              color: "#5a7a99",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign out
          </button>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 24px 0" }}>
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
              const active = label === "Daily"
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
        <div style={{ maxWidth: 760, margin: "32px auto 0", padding: "0 20px" }}>
          {habits.length === 0 ? (
            <div style={{ textAlign: "center", color: "#5a7a99", marginTop: 60, fontSize: "0.95rem" }}>
              <p>No habits yet.</p>
              <button
                onClick={async () => {
                  const { data } = await supabase
                    .from("habits")
                    .insert({ user_id: user!.id, title: "", group_end: false, sort_order: 0 })
                    .select()
                    .single()
                  if (data) setHabits([data as Habit])
                }}
                style={{
                  marginTop: 12,
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "#1a2e45",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Add your first habit
              </button>
            </div>
          ) : (
            <HabitList
              habits={habits}
              entries={entries}
              userId={user!.id}
              today={today}
              dateLabel={dateLabel}
              onHabitsChange={setHabits}
              onEntriesChange={setEntries}
            />
          )}
        </div>
      </div>
    </>
  )
}
