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
  /** Same palette as schedule events; rendered with a lighter blend on Space cards */
  card_color?: string | null
  goals: Goal[]
}

type Props = {
  goalSet: GoalSetType
  userId: string
  onDelete: (id: string) => void
  onUpdate: (updated: GoalSetType) => void
  onDragStart?: (id: string) => void
  onDragEnter?: (id: string) => void
  onDragEnd?: () => void
  isDragging?: boolean
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

export default function GoalSet({ goalSet, userId, onDelete, onUpdate, onDragStart, onDragEnter, onDragEnd, isDragging }: Props) {
  const [title, setTitle] = useState(goalSet.title)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null)
  const [dropGoalIndex, setDropGoalIndex] = useState<number | null>(null)

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

  function handleGoalDragStart(goalId: string) {
    setDraggingGoalId(goalId)
    const index = goalSet.goals.findIndex((g) => g.id === goalId)
    if (index !== -1) setDropGoalIndex(index)
  }

  function handleGoalDragEnter(goalId: string) {
    if (!draggingGoalId) return
    const index = goalSet.goals.findIndex((g) => g.id === goalId)
    if (index !== -1) setDropGoalIndex(index)
  }

  async function commitGoalReorder() {
    if (!draggingGoalId || dropGoalIndex === null) {
      setDraggingGoalId(null)
      setDropGoalIndex(null)
      return
    }
    const fromIndex = goalSet.goals.findIndex((g) => g.id === draggingGoalId)
    if (fromIndex === -1 || fromIndex === dropGoalIndex) {
      setDraggingGoalId(null)
      setDropGoalIndex(null)
      return
    }
    const updated = [...goalSet.goals]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(dropGoalIndex, 0, moved)
    onUpdate({ ...goalSet, goals: updated })
    setDraggingGoalId(null)
    setDropGoalIndex(null)
    try {
      for (let i = 0; i < updated.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await supabase.from("goals").update({ sort_order: i }).eq("id", updated[i].id)
      }
    } catch {
      // ignore
    }
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
        opacity: isDragging ? 0.4 : 1,
        transition: "opacity 0.2s",
      }}
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart?.(goalSet.id) }}
      onDragEnter={(e) => { e.stopPropagation(); onDragEnter?.(goalSet.id) }}
      onDragEnd={(e) => { e.stopPropagation(); onDragEnd?.() }}
    >
      {/* Set Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        {/* Set drag handle */}
        <div
          style={{
            marginRight: 10,
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            opacity: 0.6,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="var(--t-muted)">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </div>
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
          {/* Countdown Badge — overlay input pattern (same as RemindersPanel date chip) */}
          <div
            style={{
              position: "relative",
              display: "inline-flex",
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
            <span style={{ fontSize: "1rem", fontWeight: 700, pointerEvents: "none" }}>
              {daysLeft !== null ? daysLeft : "–"}
            </span>
            <span style={{ opacity: 0.75, fontSize: "0.8rem", pointerEvents: "none" }}>
              {daysLeft === 1 ? "day left" : daysLeft !== null ? "days left" : "set date"}
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={dateValue}
              min={today}
              onChange={(e) => handleDateChange(e.target.value)}
              className="goal-date-input"
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                cursor: "pointer",
                width: "100%",
                height: "100%",
                padding: 0,
                margin: 0,
                border: "none",
                background: "transparent",
              }}
            />
          </div>

          {/* Delete Set Button */}
          <button
            onClick={handleDeleteSet}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--t-muted)",
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
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); void commitGoalReorder() }}
      >
        {goalSet.goals.map((g, index) => (
          <div key={g.id}>
            {draggingGoalId && dropGoalIndex === index && (
              <div style={{ height: 3, borderRadius: 999, background: "var(--t-p60)", margin: "2px 0 6px" }} />
            )}
            <GoalItem
              goal={g}
              allComplete={allComplete}
              onDelete={handleGoalDelete}
              onUpdate={handleGoalUpdate}
            />
          </div>
        ))}
        {draggingGoalId && dropGoalIndex === goalSet.goals.length && (
          <div style={{ height: 3, borderRadius: 999, background: "var(--t-p60)", margin: "4px 0 0" }} />
        )}
      </div>

      <style>{`
        .goal-date-input::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
      `}</style>

      {/* Add Goal Button */}
      <div
        style={{
          width: "100%",
          marginTop: 8,
          padding: "12px",
          background: "transparent",
          border: "2px dashed var(--t-bg)",
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <button
          onClick={addGoal}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--t-muted)",
            fontWeight: 500,
            fontSize: "0.9rem",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "color 0.2s",
            padding: 0,
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
    </div>
  )
}
