"use client"

import { useRef, useState, type ReactNode } from "react"
import {
  closestCenter,
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
import type { Task } from "../lib/types"

const TASKS_END_ID = "__tasks_end__"

function SortableTaskRow({
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

function TasksEndDropSlot({ children }: { children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: TASKS_END_ID })
  return <div ref={setNodeRef}>{children}</div>
}

function TaskDragGhost({ task, allComplete }: { task: Task; allComplete: boolean }) {
  const checked = task.completed
  return (
    <div
      style={{
        background: checked ? (allComplete ? "#fef9c3" : "#dcfce7") : "#fff",
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
        width: "100%",
        boxSizing: "border-box",
      }}
    >
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
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          border: checked ? (allComplete ? "2px solid #eab308" : "2px solid #22c55e") : "2px solid var(--t-bg)",
          background: checked ? (allComplete ? "#eab308" : "#22c55e") : "transparent",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontFamily: "inherit",
          fontSize: "0.9rem",
          fontWeight: checked ? 650 : 500,
          color: checked ? (allComplete ? "#a16207" : "#166534") : "var(--t-primary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {task.title || "Task…"}
      </span>
    </div>
  )
}

function TaskCard({
  task,
  allComplete,
  onToggle,
  onTitleChange,
  onDelete,
  onGroupToggle,
  sortableContainerRef,
  dragHandleProps,
}: {
  task: Task
  allComplete: boolean
  onToggle: (taskId: string) => void
  onTitleChange: (taskId: string, title: string) => void
  onDelete: (taskId: string) => void
  onGroupToggle: (taskId: string) => void
  sortableContainerRef?: (node: HTMLElement | null) => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const checked = task.completed
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleToggle() {
    onToggle(task.id)
    await supabase.from("tasks").update({ completed: !checked }).eq("id", task.id)
  }

  function handleTitle(val: string) {
    onTitleChange(task.id, val)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(async () => {
      await supabase.from("tasks").update({ title: val }).eq("id", task.id)
    }, 600)
  }

  async function handleDelete() {
    onDelete(task.id)
    await supabase.from("tasks").delete().eq("id", task.id)
  }

  return (
    <div
      ref={sortableContainerRef as React.Ref<HTMLDivElement> | undefined}
      className="task-row"
      style={{
        background: checked ? (allComplete ? "#fef9c3" : "#dcfce7") : "#fff",
        border: checked
          ? allComplete
            ? "2px solid rgba(234,179,8,0.6)"
            : "2px solid rgba(34,197,94,0.5)"
          : "1.5px solid var(--t-border)",
        borderRadius: 12,
        padding: "10px 12px",
        display: "grid",
        gridTemplateColumns: "auto auto minmax(0, 1fr) auto",
        columnGap: 10,
        alignItems: "center",
        marginBottom: task.group_end ? 24 : 8,
        boxShadow: checked
          ? allComplete
            ? "0 6px 20px rgba(234,179,8,0.35), 0 0 0 1px rgba(234,179,8,0.1)"
            : "0 6px 20px rgba(34,197,94,0.28), 0 0 0 1px rgba(34,197,94,0.08)"
          : "0 2px 6px var(--t-p05)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <button
        type="button"
        {...(dragHandleProps ?? {})}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onGroupToggle(task.id)
        }}
        style={{
          gridColumn: 1,
          gridRow: 1,
          background: "transparent",
          border: "none",
          cursor: "grab",
          padding: 0,
          lineHeight: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          alignSelf: "center",
          touchAction: "none",
          opacity: 0.75,
          height: 24,
        }}
        aria-label="Reorder task"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="var(--t-icon)">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="2" cy="14" r="1.5" />
          <circle cx="8" cy="14" r="1.5" />
        </svg>
      </button>

      <div
        onClick={() => void handleToggle()}
        style={{
          gridColumn: 2,
          gridRow: 1,
          width: 24,
          height: 24,
          borderRadius: 5,
          border: checked ? (allComplete ? "2px solid #eab308" : "2px solid #22c55e") : "2px solid var(--t-bg)",
          background: checked ? (allComplete ? "#eab308" : "#22c55e") : "transparent",
          cursor: "pointer",
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
          alignSelf: "center",
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <input
        value={task.title}
        onChange={(e) => handleTitle(e.target.value)}
        placeholder="Task..."
        style={{
          gridColumn: 3,
          gridRow: 1,
          width: "100%",
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "inherit",
          fontSize: "0.95rem",
          fontWeight: checked ? 650 : 550,
          color: checked ? (allComplete ? "#a16207" : "#166534") : "var(--t-primary)",
          transition: "color 0.25s",
          padding: 0,
          alignSelf: "center",
          lineHeight: 1.35,
        }}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void handleDelete()
        }}
        className="task-del-btn"
        style={{
          gridColumn: 4,
          alignSelf: "center",
          background: "transparent",
          border: "none",
          color: "var(--t-icon)",
          fontSize: 18,
          cursor: "pointer",
          padding: "2px 3px",
          lineHeight: 1,
          opacity: 0,
          transition: "opacity 0.2s, color 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Delete task"
      >
        ×
      </button>
    </div>
  )
}

type Props = {
  listId: string
  userId: string
  tasks: Task[]
  onTasksChange: (next: Task[] | ((prev: Task[]) => Task[])) => void
}

export default function TaskListPanel({ listId, userId, tasks, onTasksChange }: Props) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [overTaskId, setOverTaskId] = useState<string | null>(null)
  const movedDuringDrag = useRef(false)
  const tasksRef = useRef<Task[]>(tasks)
  tasksRef.current = tasks

  function handleToggle(taskId: string) {
    onTasksChange((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)))
  }

  function handleTitleChange(taskId: string, title: string) {
    onTasksChange((prev) => prev.map((t) => (t.id === taskId ? { ...t, title } : t)))
  }

  function handleGroupToggle(taskId: string) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const toggled = !task.group_end
    onTasksChange((prev) => prev.map((t) => (t.id === taskId ? { ...t, group_end: toggled } : t)))
    supabase.from("tasks").update({ group_end: toggled }).eq("id", taskId).then()
  }

  function handleDelete(taskId: string) {
    onTasksChange((prev) => prev.filter((t) => t.id !== taskId))
  }

  async function persistTaskOrder(ordered: Task[]) {
    // Two-pass: move to staging values first to avoid unique (task_list_id, sort_order) conflicts
    for (let i = 0; i < ordered.length; i++) {
      await supabase.from("tasks").update({ sort_order: 1_000_000 + i }).eq("id", ordered[i].id)
    }
    for (let i = 0; i < ordered.length; i++) {
      await supabase.from("tasks").update({ sort_order: i }).eq("id", ordered[i].id)
    }
  }

  async function addTask() {
    const newSortOrder = tasks.length === 0 ? 0 : Math.max(...tasks.map((t) => t.sort_order)) + 1
    const { data } = await supabase
      .from("tasks")
      .insert({
        task_list_id: listId,
        user_id: userId,
        title: "",
        description: null,
        completed: false,
        sort_order: newSortOrder,
      })
      .select()
      .single()
    if (data) onTasksChange((prev) => [...prev, data as Task])
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const activeDragTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null
  const allComplete = tasks.length > 0 && tasks.every((t) => t.completed)

  function handleDragStart(event: DragStartEvent) {
    movedDuringDrag.current = false
    setActiveTaskId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.active?.id) return
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId) return
    movedDuringDrag.current = true
    setOverTaskId(overId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null

    setActiveTaskId(null)
    setOverTaskId(null)
    setTimeout(() => {
      movedDuringDrag.current = false
    }, 0)

    if (!overId || activeId === overId) return

    const prev = tasksRef.current
    const oldIndex = prev.findIndex((t) => t.id === activeId)
    const newIndex =
      overId === TASKS_END_ID ? prev.length - 1 : prev.findIndex((t) => t.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const withOrder = arrayMove(prev, oldIndex, newIndex).map((t, i) => ({ ...t, sort_order: i }))
    onTasksChange(withOrder)
    await persistTaskOrder(withOrder)
  }

  return (
    <>
      <style>{`
        .task-row:hover .task-del-btn {
          opacity: 1 !important;
        }
      `}</style>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={() => {
          setActiveTaskId(null)
          setOverTaskId(null)
          setTimeout(() => {
            movedDuringDrag.current = false
          }, 0)
        }}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div>
            {tasks.map((t) => {
              const draggingRow = activeTaskId === t.id
              const showPlaceholder =
                activeTaskId !== null && overTaskId === t.id && !draggingRow
              return (
                <div key={t.id}>
                  {showPlaceholder && (
                    <div
                      className="task-drop-placeholder"
                      style={{
                        minHeight: 44,
                        marginBottom: t.group_end ? 24 : 8,
                        borderRadius: 12,
                        border: "2px dashed var(--t-p30)",
                        background: "var(--t-p05)",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                  <SortableTaskRow id={t.id}>
                    {({ setNodeRef, attributes, listeners }) =>
                      draggingRow ? (
                        <div
                          ref={setNodeRef}
                          style={{
                            minHeight: 44,
                            marginBottom: t.group_end ? 24 : 8,
                            borderRadius: 12,
                            opacity: 0.2,
                            boxSizing: "border-box",
                            background: "var(--t-p05)",
                          }}
                          aria-hidden
                        />
                      ) : (
                        <TaskCard
                          task={t}
                          allComplete={allComplete}
                          onToggle={handleToggle}
                          onTitleChange={handleTitleChange}
                          onDelete={handleDelete}
                          onGroupToggle={handleGroupToggle}
                          sortableContainerRef={setNodeRef}
                          dragHandleProps={{ ...attributes, ...listeners }}
                        />
                      )
                    }
                  </SortableTaskRow>
                </div>
              )
            })}

            {activeTaskId && overTaskId === TASKS_END_ID && (
              <div
                className="task-drop-placeholder"
                style={{
                  minHeight: 44,
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

        <TasksEndDropSlot>
          <div style={{ marginTop: 8, border: "2px dashed var(--t-bg)", borderRadius: 12, textAlign: "center" }}>
            <button
              onClick={() => void addTask()}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "var(--t-muted)",
                fontWeight: 500,
                fontSize: "0.9rem",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 0.2s",
                padding: "12px",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.color = "var(--t-primary)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.color = "var(--t-muted)"
              }}
            >
              + Add Task
            </button>
          </div>
        </TasksEndDropSlot>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeDragTask ? <TaskDragGhost task={activeDragTask} allComplete={allComplete} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  )
}
