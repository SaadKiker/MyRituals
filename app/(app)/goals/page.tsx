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
          <div style={{ textAlign: "center", color: "#5a7a99", marginTop: 60, fontSize: "1rem" }}>
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
                background: "#2f6690",
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
            {goalSets.map((set) => (
              <GoalSet
                key={set.id}
                goalSet={set}
                userId={user.id}
                onDelete={handleSetDelete}
                onUpdate={handleSetUpdate}
              />
            ))}

            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button
                onClick={addGoalSet}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  border: "2px dashed rgba(47,102,144,0.25)",
                  background: "transparent",
                  color: "#5a7a99",
                  fontSize: 24,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#2f6690"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#5a7a99"
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
