"use client"

import { useState, useRef } from "react"
import { supabase } from "../lib/supabase"
import HabitItem, { type Habit, type HabitEntry } from "./HabitItem"

type Props = {
  habits: Habit[]
  entries: HabitEntry[]
  userId: string
  today: string
  dateLabel: string
  onHabitsChange: (habits: Habit[]) => void
  onEntriesChange: (entries: HabitEntry[]) => void
}

export default function HabitList({ habits, entries, userId, today, dateLabel, onHabitsChange, onEntriesChange }: Props) {
  const [resetting, setResetting] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allComplete = habits.length > 0 && habits.every((h) => {
    const e = entries.find((en) => en.habit_id === h.id)
    return e?.completed === 1
  })

  function handleToggle(habitId: string) {
    const existing = entries.find((e) => e.habit_id === habitId)
    if (existing) {
      onEntriesChange(
        entries.map((e) =>
          e.habit_id === habitId ? { ...e, completed: e.completed === 1 ? 0 : 1 } : e
        )
      )
    } else {
      onEntriesChange([
        ...entries,
        { habit_id: habitId, user_id: userId, entry_date: today, completed: 1 },
      ])
    }
  }

  function handleTitleChange(habitId: string, title: string) {
    onHabitsChange(habits.map((h) => (h.id === habitId ? { ...h, title } : h)))
  }

  function handleDelete(habitId: string) {
    onHabitsChange(habits.filter((h) => h.id !== habitId))
    onEntriesChange(entries.filter((e) => e.habit_id !== habitId))
  }

  async function addHabit() {
    const newSortOrder = habits.length
    const { data, error } = await supabase
      .from("habits")
      .insert({ user_id: userId, title: "", group_end: false, sort_order: newSortOrder })
      .select()
      .single()
    if (!error && data) {
      onHabitsChange([...habits, data as Habit])
    }
  }

  function startReset() {
    const anyChecked = habits.some((h) => {
      const e = entries.find((en) => en.habit_id === h.id)
      return e?.completed === 1
    })
    if (!anyChecked) return
    setResetting(true)
    resetTimer.current = setTimeout(async () => {
      const updated = entries.map((e) => ({ ...e, completed: 0 as const }))
      onEntriesChange(updated)
      setResetting(false)
      await supabase
        .from("habit_entries")
        .update({ completed: 0 })
        .eq("user_id", userId)
        .eq("entry_date", today)
    }, 1000)
  }

  function cancelReset() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setResetting(false)
  }

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#5a7a99", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {dateLabel}
        </span>
        <div
          onMouseDown={startReset}
          onMouseUp={cancelReset}
          onMouseLeave={cancelReset}
          onTouchStart={startReset}
          onTouchEnd={cancelReset}
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid rgba(192,57,43,0.35)",
            background: "rgba(192,57,43,0.08)",
            color: "#c0392b",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            userSelect: "none",
            fontFamily: "inherit",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: resetting ? "100%" : "0%",
              background: "rgba(192,57,43,0.85)",
              transition: resetting ? "width 1s linear" : "width 0.2s",
              zIndex: 1,
            }}
          />
          <span style={{ position: "relative", zIndex: 2, color: resetting ? "#fff" : "#c0392b" }}>
            {resetting ? "Hold…" : "Hold to Reset"}
          </span>
        </div>
      </div>

      {/* Habit rows */}
      <div>
        {habits.map((h) => (
          <HabitItem
            key={h.id}
            habit={h}
            entry={entries.find((e) => e.habit_id === h.id)}
            allComplete={allComplete}
            userId={userId}
            today={today}
            onToggle={handleToggle}
            onTitleChange={handleTitleChange}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Add Habit */}
      <div style={{ marginTop: 8 }}>
        <button
          onClick={addHabit}
          style={{
            width: "100%",
            padding: "12px",
            background: "transparent",
            border: "2px dashed #b0d2e3",
            borderRadius: 12,
            color: "#5a7a99",
            fontWeight: 500,
            fontSize: "0.9rem",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#1a2e45"
            ;(e.currentTarget as HTMLButtonElement).style.color = "#1a2e45"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#b0d2e3"
            ;(e.currentTarget as HTMLButtonElement).style.color = "#5a7a99"
          }}
        >
          + Add Habit
        </button>
      </div>
    </div>
  )
}
