"use client"

import { useState, useRef } from "react"
import { supabase } from "../lib/supabase"
import GoalItem, { type Goal } from "./GoalItem"

export type GoalSetType = {
  id: string
  user_id: string
  title: string
  target_date: string | null
  sort_order: number
  goals: Goal[]
}

type Props = {
  goalSet: GoalSetType
  userId: string
  onDelete: (id: string) => void
  onUpdate: (updated: GoalSetType) => void
}

function getDaysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null
  const parts = dateStr.split("T")[0].split("-").map(Number)
  const target = new Date(parts[0], parts[1] - 1, parts[2])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function GoalSet({ goalSet, userId, onDelete, onUpdate }: Props) {
  const [title, setTitle] = useState(goalSet.title)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  function openDatePicker() {
    if (!dateInputRef.current) return
    try {
      dateInputRef.current.showPicker()
    } catch {
      dateInputRef.current.click()
    }
  }

  const allComplete =
    goalSet.goals.length > 0 &&
    goalSet.goals.every((g) => g.target_value > 0 && g.current_value >= g.target_value)

  const daysLeft = getDaysLeft(goalSet.target_date)

  async function saveTitle(val: string) {
    onUpdate({ ...goalSet, title: val })
    await supabase.from("goal_sets").update({ title: val }).eq("id", goalSet.id)
  }

  async function handleDateChange(val: string) {
    const newDate = val || null
    const updated = { ...goalSet, target_date: newDate }
    onUpdate(updated)
    await supabase.from("goal_sets").update({ target_date: newDate }).eq("id", goalSet.id)
  }

  async function addGoal() {
    const newSortOrder = goalSet.goals.length
    const { data, error } = await supabase
      .from("goals")
      .insert({
        goal_set_id: goalSet.id,
        user_id: userId,
        title: "",
        current_value: 0,
        target_value: 10,
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (!error && data) {
      onUpdate({ ...goalSet, goals: [...goalSet.goals, data as Goal] })
    }
  }

  function handleGoalDelete(goalId: string) {
    onUpdate({ ...goalSet, goals: goalSet.goals.filter((g) => g.id !== goalId) })
  }

  function handleGoalUpdate(updated: Goal) {
    onUpdate({ ...goalSet, goals: goalSet.goals.map((g) => (g.id === updated.id ? updated : g)) })
  }

  async function handleDeleteSet() {
    onDelete(goalSet.id)
    await supabase.from("goal_sets").delete().eq("id", goalSet.id)
  }

  const dateValue = goalSet.target_date ? goalSet.target_date.split("T")[0] : ""
  const today = new Date().toISOString().split("T")[0]

  return (
    <div
      style={{
        marginBottom: 48,
        paddingBottom: 32,
        borderBottom: "1px solid var(--t-p08)",
      }}
    >
      {/* Set Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (titleTimer.current) clearTimeout(titleTimer.current)
            titleTimer.current = setTimeout(() => saveTitle(e.target.value), 600)
          }}
          placeholder="Goal Set Title"
          style={{
            fontSize: "clamp(1.2rem, 4vw, 1.5rem)",
            fontWeight: 700,
            color: "var(--t-primary)",
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "inherit",
            flex: 1,
            marginRight: 12,
            padding: "2px 0",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Countdown Badge */}
          <div
            onClick={openDatePicker}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--t-p08)",
              border: "1px solid var(--t-p18)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: "0.88rem",
              color: "var(--t-primary)",
              fontWeight: 600,
              whiteSpace: "nowrap",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <span style={{ fontSize: "1rem", fontWeight: 700 }}>
              {daysLeft !== null ? daysLeft : "–"}
            </span>
            <span style={{ opacity: 0.75, fontSize: "0.8rem" }}>
              {daysLeft === 1 ? "day left" : daysLeft !== null ? "days left" : "set date"}
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={dateValue}
              min={today}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{
                position: "absolute",
                opacity: 0,
                width: 0,
                height: 0,
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Delete Set Button */}
          <button
            onClick={handleDeleteSet}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--t-icon)",
              fontSize: 22,
              cursor: "pointer",
              padding: "2px 4px",
              lineHeight: 1,
            }}
            title="Delete Goal Set"
          >
            ×
          </button>
        </div>
      </div>

      {/* Goals List */}
      <div>
        {goalSet.goals.map((g) => (
          <GoalItem
            key={g.id}
            goal={g}
            allComplete={allComplete}
            onDelete={handleGoalDelete}
            onUpdate={handleGoalUpdate}
          />
        ))}
      </div>

      {/* Add Goal Button */}
      <button
        onClick={addGoal}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "12px",
          background: "transparent",
          border: "2px dashed var(--t-bg)",
          borderRadius: 12,
          color: "var(--t-muted)",
          fontWeight: 500,
          fontSize: "0.9rem",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color = "var(--t-primary)"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color = "var(--t-muted)"
        }}
      >
        + Add Goal
      </button>
    </div>
  )
}
