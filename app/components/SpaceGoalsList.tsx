"use client"

import { useState, useRef, type ReactNode } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { supabase } from "../lib/supabase"
import GoalItem, { type Goal } from "./GoalItem"

const GOALS_END_ID = "__goals_end__"

type Props = {
  goalSetId: string
  userId: string
  initialGoals: Goal[]
}

function GoalDragGhost({ goal, allComplete }: { goal: Goal; allComplete: boolean }) {
  return (
    <div style={{ opacity: 0.96, transform: "rotate(0.5deg)", cursor: "grabbing" }}>
      <GoalItem
        goal={goal}
        allComplete={allComplete}
        onDelete={() => {}}
        onUpdate={() => {}}
      />
    </div>
  )
}

function SortableGoalRow({
  id,
  children,
}: {
  id: string
  children: (args: {
    setNodeRef: (node: HTMLElement | null) => void
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners | undefined
  }) => ReactNode
}) {
  const { attributes, listeners, setNodeRef } = useSortable({ id })
  return <>{children({ setNodeRef, attributes, listeners })}</>
}

function GoalsEndDropSlot({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: GOALS_END_ID })
  return <div ref={setNodeRef}>{children}</div>
}

export default function SpaceGoalsList({ goalSetId, userId, initialGoals }: Props) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [overGoalId, setOverGoalId] = useState<string | null>(null)
  const movedDuringDrag = useRef(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const allComplete =
    goals.length > 0 &&
    goals.every((g) => g.target_value > 0 && g.current_value >= g.target_value)

  const visibleGoals = activeGoalId ? goals.filter((g) => g.id !== activeGoalId) : goals
  const activeDragGoal = activeGoalId ? goals.find((g) => g.id === activeGoalId) : null

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

  async function persistOrder(updated: Goal[]) {
    try {
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("goals").update({ sort_order: i }).eq("id", updated[i].id)
      }
    } catch {
      // ignore
    }
  }

  function handleDragStart(event: DragStartEvent) {
    movedDuringDrag.current = false
    setActiveGoalId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.active?.id) return
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId) return
    movedDuringDrag.current = true
    setOverGoalId(overId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null

    setActiveGoalId(null)
    setOverGoalId(null)
    setTimeout(() => {
      movedDuringDrag.current = false
    }, 0)

    if (!overId || activeId === overId) return

    const oldIndex = goals.findIndex((g) => g.id === activeId)
    const newIndex = overId === GOALS_END_ID ? goals.length - 1 : goals.findIndex((g) => g.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const updated = arrayMove(goals, oldIndex, newIndex)
    setGoals(updated)
    await persistOrder(updated)
  }

  return (
    <>
      <style>{`
        .goal-card:hover .goal-delete-btn {
          opacity: 1 !important;
        }
      `}</style>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={() => {
          setActiveGoalId(null)
          setOverGoalId(null)
          setTimeout(() => {
            movedDuringDrag.current = false
          }, 0)
        }}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <SortableContext items={visibleGoals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div>
            {visibleGoals.map((g) => {
              const showPlaceholder = activeGoalId !== null && overGoalId === g.id
              return (
                <div key={g.id}>
                  {showPlaceholder && (
                    <div
                      className="goal-drop-placeholder"
                      style={{
                        minHeight: 80,
                        marginBottom: 10,
                        borderRadius: 12,
                        border: "2px dashed var(--t-p30)",
                        background: "var(--t-p05)",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                  <SortableGoalRow id={g.id}>
                    {({ setNodeRef, attributes, listeners }) => (
                      <GoalItem
                        goal={g}
                        allComplete={allComplete}
                        onDelete={handleGoalDelete}
                        onUpdate={handleGoalUpdate}
                        sortableContainerRef={setNodeRef}
                        dragHandleProps={{ ...attributes, ...listeners }}
                      />
                    )}
                  </SortableGoalRow>
                </div>
              )
            })}
            
            {activeGoalId && overGoalId === GOALS_END_ID && (
              <div
                className="goal-drop-placeholder"
                style={{
                  minHeight: 80,
                  marginBottom: 10,
                  borderRadius: 12,
                  border: "2px dashed var(--t-p30)",
                  background: "var(--t-p05)",
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        </SortableContext>

        <GoalsEndDropSlot>
          <div style={{ marginTop: 8, border: "2px dashed var(--t-bg)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
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
        </GoalsEndDropSlot>
        
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeDragGoal ? (
            <GoalDragGhost goal={activeDragGoal} allComplete={allComplete} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  )
}
