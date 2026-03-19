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
  onDragStart: (habitId: string) => void
  onDragEnter: (habitId: string) => void
  onDragEnd: () => void
  isDragging: boolean
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
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
}: Props) {
  const checked = entry?.completed === 1
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleDragStart() {
    onDragStart(habit.id)
  }

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
      draggable
      onDragStart={handleDragStart}
      onDragEnter={() => onDragEnter(habit.id)}
      onDragEnd={onDragEnd}
      style={{
        background: checked
          ? allComplete
            ? "#fef9c3"
            : "#dcfce7"
          : "#fff",
        border: checked
          ? allComplete
            ? "2px solid rgba(234,179,8,0.6)"
            : "2px solid rgba(34,197,94,0.5)"
          : "1.5px solid var(--t-border)",
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: habit.group_end ? 24 : 8,
        boxShadow: checked
          ? allComplete
            ? "0 6px 20px rgba(234,179,8,0.35), 0 0 0 1px rgba(234,179,8,0.1)"
            : "0 6px 20px rgba(34,197,94,0.28), 0 0 0 1px rgba(34,197,94,0.08)"
          : "0 2px 6px var(--t-p05)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        position: "relative",
      }}
    >
      {/* Drag handle + Checkbox */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginRight: 4,
        }}
      >
        <button
          type="button"
          style={{
            background: "transparent",
            border: "none",
            cursor: "grab",
            padding: 0,
            lineHeight: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: isDragging ? 0.6 : 1,
          }}
          aria-label="Reorder habit"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="var(--t-icon)">
            {/* 3 rows x 2 columns = 6 bold dots */}
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Checkbox */}
      <div
        onClick={handleToggle}
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          border: checked
            ? allComplete
              ? "2px solid #eab308"
              : "2px solid #22c55e"
            : "2px solid var(--t-bg)",
          background: checked
            ? allComplete
              ? "#eab308"
              : "#22c55e"
            : "transparent",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
          transform: checked ? "scale(1.08)" : "scale(1)",
          boxShadow: checked
            ? allComplete
              ? "0 4px 14px rgba(234,179,8,0.55)"
              : "0 4px 14px rgba(34,197,94,0.45)"
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
              ? "#a16207"
              : "#166534"
            : "var(--t-primary)",
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
          color: "var(--t-icon)",
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
