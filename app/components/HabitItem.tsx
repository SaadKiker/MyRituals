"use client"

import { useRef } from "react"
import { supabase } from "../lib/supabase"

export type Habit = {
  id: string
  user_id: string
  title: string
  group_end: boolean
  sort_order: number
}

export type HabitEntry = {
  id?: string
  habit_id: string
  user_id: string
  entry_date: string
  completed: 0 | 1
}

type Props = {
  habit: Habit
  entry: HabitEntry | undefined
  allComplete: boolean
  userId: string
  today: string
  onToggle: (habitId: string) => void
  onTitleChange: (habitId: string, title: string) => void
  onDelete: (habitId: string) => void
}

export default function HabitItem({
  habit,
  entry,
  allComplete,
  userId,
  today,
  onToggle,
  onTitleChange,
  onDelete,
}: Props) {
  const checked = entry?.completed === 1
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleToggle() {
    onToggle(habit.id)
    const newCompleted: 0 | 1 = checked ? 0 : 1
    await supabase.from("habit_entries").upsert(
      {
        habit_id: habit.id,
        user_id: userId,
        entry_date: today,
        completed: newCompleted,
      },
      { onConflict: "habit_id,entry_date" }
    )
  }

  async function handleTitleChange(val: string) {
    onTitleChange(habit.id, val)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(async () => {
      await supabase.from("habits").update({ title: val }).eq("id", habit.id)
    }, 600)
  }

  async function handleDelete() {
    onDelete(habit.id)
    await supabase.from("habits").delete().eq("id", habit.id)
  }

  return (
    <div
      className={`habit-row${habit.group_end ? " group-end" : ""}`}
      style={{
        background: checked
          ? allComplete
            ? "#fffde8"
            : "#eef9f2"
          : "#fff",
        border: checked
          ? allComplete
            ? "1.5px solid rgba(255,215,0,0.55)"
            : "1.5px solid rgba(48,209,88,0.45)"
          : "1.5px solid #d8eaf3",
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: habit.group_end ? 24 : 8,
        boxShadow: checked
          ? allComplete
            ? "0 4px 16px rgba(255,215,0,0.2)"
            : "0 4px 16px rgba(48,209,88,0.15)"
          : "0 2px 6px rgba(26,46,69,0.05)",
        transition: "all 0.25s ease",
        position: "relative",
      }}
    >
      {/* Checkbox */}
      <div
        onClick={handleToggle}
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          border: checked
            ? allComplete
              ? "2px solid #ffd700"
              : "2px solid #30d158"
            : "2px solid #b0d2e3",
          background: checked
            ? allComplete
              ? "#ffd700"
              : "#30d158"
            : "transparent",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          transform: checked ? "scale(1.05)" : "scale(1)",
          boxShadow: checked
            ? allComplete
              ? "0 3px 10px rgba(255,215,0,0.45)"
              : "0 3px 10px rgba(48,209,88,0.35)"
            : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && (
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Title Input */}
      <input
        value={habit.title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Habit..."
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "inherit",
          fontSize: "0.9rem",
          fontWeight: checked ? 600 : 500,
          color: checked
            ? allComplete
              ? "#b8960a"
              : "#1a9a40"
            : "#1a2e45",
          transition: "color 0.25s",
          padding: 0,
        }}
      />

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="habit-del-btn"
        style={{
          background: "transparent",
          border: "none",
          color: "#99b8cc",
          fontSize: 22,
          cursor: "pointer",
          padding: "2px 4px",
          lineHeight: 1,
          opacity: 0,
          transition: "opacity 0.2s, color 0.2s",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
