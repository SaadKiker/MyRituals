"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import HabitList from "../../components/HabitList"
import type { Habit, HabitEntry } from "../../components/HabitItem"
import { useAppUser } from "../layout"

function getToday() {
  return new Date().toISOString().split("T")[0]
}

export default function DailyPage() {
  const user = useAppUser()
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const today = getToday()

  useEffect(() => {
    Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("habit_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", today),
    ]).then(([{ data: habitsData }, { data: entriesData }]) => {
      setHabits((habitsData as Habit[]) ?? [])
      setEntries((entriesData as HabitEntry[]) ?? [])
      setLoading(false)
    })
  }, [user.id, today])

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
      <div style={{ maxWidth: 760, margin: "90px auto 0", padding: "0 20px" }}>
        {habits.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--t-muted)", marginTop: 60, fontSize: "1rem" }}>
            <p>No habits yet.</p>
            <button
              onClick={async () => {
                const { data } = await supabase
                  .from("habits")
                  .insert({ user_id: user.id, title: "", group_end: false, sort_order: 0 })
                  .select()
                  .single()
                if (data) setHabits([data as Habit])
              }}
              style={{
                marginTop: 12,
                padding: "10px 24px",
                borderRadius: 10,
                border: "none",
                background: "var(--t-primary)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "1rem",
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
            userId={user.id}
            today={today}
            dateLabel={dateLabel}
            onHabitsChange={setHabits}
            onEntriesChange={setEntries}
          />
        )}
      </div>
    </>
  )
}
