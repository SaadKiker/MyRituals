"use client"

import { useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import GoalItem, { type Goal } from "./GoalItem"

type Props = {
  goalSetId: string
  userId: string
  initialGoals: Goal[]
}

export default function SpaceGoalsList({ goalSetId, userId, initialGoals }: Props) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null)
  const [dropGoalIndex, setDropGoalIndex] = useState<number | null>(null)

  const allComplete =
    goals.length > 0 &&
    goals.every((g) => g.target_value > 0 && g.current_value >= g.target_value)

  const orderedGoals = useMemo(() => {
    if (!draggingGoalId || dropGoalIndex === null) return goals
    const fromIndex = goals.findIndex((g) => g.id === draggingGoalId)
    if (fromIndex === -1 || fromIndex === dropGoalIndex) return goals
    const updated = [...goals]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(dropGoalIndex, 0, moved)
    return updated
  }, [goals, draggingGoalId, dropGoalIndex])

  async function addGoal() {
    const newSortOrder = goals.length
    const { data, error } = await supabase
      .from("goals")
      .insert({
        goal_set_id: goalSetId,
        user_id: userId,
        title: "",
        current_value: 0,
        target_value: 10,
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (!error && data) {
      setGoals((prev) => [...prev, data as Goal])
    }
  }

  function handleGoalDelete(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId))
  }

  function handleGoalUpdate(updated: Goal) {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
  }

  function handleGoalDragStart(goalId: string) {
    setDraggingGoalId(goalId)
    const index = goals.findIndex((g) => g.id === goalId)
    if (index !== -1) setDropGoalIndex(index)
  }

  function handleGoalDragEnter(goalId: string) {
    if (!draggingGoalId) return
    const index = goals.findIndex((g) => g.id === goalId)
    if (index !== -1) setDropGoalIndex(index)
  }

  async function commitGoalReorder() {
    if (!draggingGoalId || dropGoalIndex === null) {
      setDraggingGoalId(null)
      setDropGoalIndex(null)
      return
    }
    const fromIndex = goals.findIndex((g) => g.id === draggingGoalId)
    if (fromIndex === -1 || fromIndex === dropGoalIndex) {
      setDraggingGoalId(null)
      setDropGoalIndex(null)
      return
    }
    const updated = [...goals]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(dropGoalIndex, 0, moved)
    setGoals(updated)
    setDraggingGoalId(null)
    setDropGoalIndex(null)
    try {
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("goals").update({ sort_order: i }).eq("id", updated[i].id)
      }
    } catch {
      // ignore
    }
  }

  return (
    <>
      <style>{`
        .goal-card:hover .goal-delete-btn {
          opacity: 1 !important;
        }
      `}</style>
      <div
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          void commitGoalReorder()
        }}
      >
        {orderedGoals.map((g, index) => (
          <div key={g.id}>
            {draggingGoalId && dropGoalIndex === index && (
              <div style={{ height: 3, borderRadius: 999, background: "var(--t-p60)", margin: "2px 0 6px" }} />
            )}
            <GoalItem
              goal={g}
              allComplete={allComplete}
              onDelete={handleGoalDelete}
              onUpdate={handleGoalUpdate}
              onDragStart={handleGoalDragStart}
              onDragEnter={handleGoalDragEnter}
              onDragEnd={() => void commitGoalReorder()}
              isDragging={draggingGoalId === g.id}
            />
          </div>
        ))}
      </div>

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
    </>
  )
}
