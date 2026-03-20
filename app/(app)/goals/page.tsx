"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import GoalSet, { type GoalSetType } from "../../components/GoalSet"
import { useAppUser } from "../layout"

export default function GoalsPage() {
  const user = useAppUser()
  const [goalSets, setGoalSets] = useState<GoalSetType[]>([])
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)
  const [draggingSetId, setDraggingSetId] = useState<string | null>(null)
  const [dropSetIndex, setDropSetIndex] = useState<number | null>(null)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    ;(async () => {
      const { data: sets } = await supabase
        .from("goal_sets")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })

      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })

      const combined: GoalSetType[] = (sets ?? []).map((s) => ({
        ...s,
        goals: (goals ?? []).filter((g) => g.goal_set_id === s.id),
      }))

      setGoalSets(combined)
      setLoading(false)
    })()
  }, [user.id])

  async function addGoalSet() {
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
    setGoalSets((prev) => prev.filter((s) => s.id !== setId))
  }

  function handleSetUpdate(updated: GoalSetType) {
    setGoalSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  function handleSetDragStart(setId: string) {
    setDraggingSetId(setId)
    const index = goalSets.findIndex((s) => s.id === setId)
    if (index !== -1) setDropSetIndex(index)
  }

  function handleSetDragEnter(setId: string) {
    if (!draggingSetId) return
    const index = goalSets.findIndex((s) => s.id === setId)
    if (index !== -1) setDropSetIndex(index)
  }

  async function commitSetReorder() {
    if (!draggingSetId || dropSetIndex === null) {
      setDraggingSetId(null)
      setDropSetIndex(null)
      return
    }
    const fromIndex = goalSets.findIndex((s) => s.id === draggingSetId)
    if (fromIndex === -1 || fromIndex === dropSetIndex) {
      setDraggingSetId(null)
      setDropSetIndex(null)
      return
    }
    const updated = [...goalSets]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(dropSetIndex, 0, moved)
    setGoalSets(updated)
    setDraggingSetId(null)
    setDropSetIndex(null)
    try {
      for (let i = 0; i < updated.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await supabase.from("goal_sets").update({ sort_order: i }).eq("id", updated[i].id)
      }
    } catch {
      // ignore
    }
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
          maxWidth: 760,
          margin: "32px auto 0",
          padding: "0 20px",
        }}
      >
        {goalSets.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--t-muted)", marginTop: 60, fontSize: "1rem" }}>
            <p>No goals yet.</p>
            <button
              onClick={async () => {
                const { data: newSet } = await supabase
                  .from("goal_sets")
                  .insert({ user_id: user.id, title: "", target_date: null, sort_order: 0 })
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

                  setGoalSets([{ ...(newSet as GoalSetType), goals: newGoal ? [newGoal] : [] }])
                }
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
              Add your first goal
            </button>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void commitSetReorder() }}
            >
              {goalSets.map((set, index) => (
                <div key={set.id}>
                  {draggingSetId && dropSetIndex === index && (
                    <div style={{ height: 3, borderRadius: 999, background: "var(--t-p60)", margin: "0 0 16px" }} />
                  )}
                  <GoalSet
                    goalSet={set}
                    userId={user.id}
                    onDelete={handleSetDelete}
                    onUpdate={handleSetUpdate}
                    onDragStart={handleSetDragStart}
                    onDragEnter={handleSetDragEnter}
                    onDragEnd={() => void commitSetReorder()}
                    isDragging={draggingSetId === set.id}
                  />
                </div>
              ))}
              {draggingSetId && dropSetIndex === goalSets.length && (
                <div style={{ height: 3, borderRadius: 999, background: "var(--t-p60)", margin: "0 0 8px" }} />
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button
                onClick={addGoalSet}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  border: "2px dashed var(--t-p25)",
                  background: "transparent",
                  color: "var(--t-muted)",
                  fontSize: 24,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "var(--t-primary)"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "var(--t-muted)"
                }}
                title="Add Goal Set"
              >
                +
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
