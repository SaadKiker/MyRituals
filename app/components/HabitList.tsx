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
import HabitItem, { type Habit, type HabitEntry } from "./HabitItem"

const HABITS_END_ID = "__habits_end__"

type Props = {
  habits: Habit[]
  entries: HabitEntry[]
  userId: string
  today: string
  dateLabel: string
  onHabitsChange: (habits: Habit[]) => void
  onEntriesChange: (entries: HabitEntry[]) => void
}

function HabitDragGhost({
  habit,
  entry,
  allComplete,
}: {
  habit: Habit
  entry: HabitEntry | undefined
  allComplete: boolean
}) {
  const checked = entry?.completed === 1
  return (
    <div
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
        boxShadow: checked
          ? allComplete
            ? "0 8px 24px rgba(234,179,8,0.4)"
            : "0 8px 24px rgba(34,197,94,0.35)"
          : "0 8px 20px var(--t-p12)",
        cursor: "grabbing",
        opacity: 0.96,
        transform: "rotate(0.5deg)",
        maxWidth: 720,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginRight: 4 }}>
        <span style={{ display: "flex", opacity: 0.7 }}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="var(--t-icon)">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </span>
      </div>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          border: checked
            ? allComplete
              ? "2px solid #eab308"
              : "2px solid #22c55e"
            : "2px solid var(--t-bg)",
          background: checked ? (allComplete ? "#eab308" : "#22c55e") : "transparent",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontFamily: "inherit",
          fontSize: "0.9rem",
          fontWeight: checked ? 600 : 500,
          color: checked ? (allComplete ? "#a16207" : "#166534") : "var(--t-primary)",
        }}
      >
        {habit.title || "Habit…"}
      </span>
    </div>
  )
}

function SortableHabitRow({
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

function HabitsEndDropSlot({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: HABITS_END_ID })
  return <div ref={setNodeRef}>{children}</div>
}

export default function HabitList({ habits, entries, userId, today, dateLabel, onHabitsChange, onEntriesChange }: Props) {
  const [resetting, setResetting] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null)
  const [overHabitId, setOverHabitId] = useState<string | null>(null)
  const movedDuringDrag = useRef(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const allComplete =
    habits.length > 0 &&
    habits.every((h) => {
      const e = entries.find((en) => en.habit_id === h.id)
      return e?.completed === 1
    })

  const visibleHabits = activeHabitId ? habits.filter((h) => h.id !== activeHabitId) : habits

  const activeDragHabit = activeHabitId ? habits.find((h) => h.id === activeHabitId) : null
  const activeDragEntry = activeDragHabit ? entries.find((e) => e.habit_id === activeDragHabit.id) : undefined

  function handleToggle(habitId: string) {
    const existing = entries.find((e) => e.habit_id === habitId)
    if (existing) {
      onEntriesChange(
        entries.map((e) => (e.habit_id === habitId ? { ...e, completed: e.completed === 1 ? 0 : 1 } : e))
      )
    } else {
      onEntriesChange([...entries, { habit_id: habitId, user_id: userId, entry_date: today, completed: 1 }])
    }
  }

  function handleTitleChange(habitId: string, title: string) {
    onHabitsChange(habits.map((h) => (h.id === habitId ? { ...h, title } : h)))
  }

  function handleDelete(habitId: string) {
    onHabitsChange(habits.filter((h) => h.id !== habitId))
    onEntriesChange(entries.filter((e) => e.habit_id !== habitId))
  }

  async function persistOrder(updated: Habit[]) {
    try {
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("habits").update({ sort_order: i }).eq("id", updated[i].id)
      }
    } catch {
      // ignore
    }
  }

  function handleDragStart(event: DragStartEvent) {
    movedDuringDrag.current = false
    setActiveHabitId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.active?.id) return
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId) return
    movedDuringDrag.current = true
    setOverHabitId(overId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null

    setActiveHabitId(null)
    setOverHabitId(null)
    setTimeout(() => {
      movedDuringDrag.current = false
    }, 0)

    if (!overId || activeId === overId) return

    const oldIndex = habits.findIndex((h) => h.id === activeId)
    const newIndex = overId === HABITS_END_ID ? habits.length - 1 : habits.findIndex((h) => h.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const updated = arrayMove(habits, oldIndex, newIndex)
    onHabitsChange(updated)
    await persistOrder(updated)
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--t-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={() => {
          setActiveHabitId(null)
          setOverHabitId(null)
          setTimeout(() => {
            movedDuringDrag.current = false
          }, 0)
        }}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <SortableContext items={visibleHabits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
          <div>
            {visibleHabits.map((h) => {
              const showPlaceholder = activeHabitId !== null && overHabitId === h.id
              return (
                <div key={h.id}>
                  {showPlaceholder && (
                    <div
                      className="habit-drop-placeholder"
                      style={{
                        minHeight: 48,
                        marginBottom: h.group_end ? 24 : 8,
                        borderRadius: 12,
                        border: "2px dashed var(--t-p30)",
                        background: "var(--t-p05)",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                  <SortableHabitRow id={h.id}>
                    {({ setNodeRef, attributes, listeners }) => (
                      <HabitItem
                        habit={h}
                        entry={entries.find((e) => e.habit_id === h.id)}
                        allComplete={allComplete}
                        userId={userId}
                        today={today}
                        onToggle={handleToggle}
                        onTitleChange={handleTitleChange}
                        onDelete={handleDelete}
                        sortableContainerRef={setNodeRef}
                        dragHandleProps={{ ...attributes, ...listeners }}
                      />
                    )}
                  </SortableHabitRow>
                </div>
              )
            })}

            {activeHabitId && overHabitId === HABITS_END_ID && (
              <div
                className="habit-drop-placeholder"
                style={{
                  minHeight: 48,
                  marginBottom: 8,
                  borderRadius: 12,
                  border: "2px dashed var(--t-p30)",
                  background: "var(--t-p05)",
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        </SortableContext>

        <HabitsEndDropSlot>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={addHabit}
              style={{
                width: "100%",
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
              + Add Habit
            </button>
          </div>
        </HabitsEndDropSlot>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeDragHabit ? (
            <HabitDragGhost habit={activeDragHabit} entry={activeDragEntry} allComplete={allComplete} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
