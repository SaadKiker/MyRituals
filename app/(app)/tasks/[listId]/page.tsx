"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { supabase } from "../../../lib/supabase"
import type { Task, TaskList } from "../../../lib/types"
import { useAppUser } from "../../layout"

const TASKS_END_ID = "__tasks_end__"

function getListLabel(title: string) {
  return title.trim() ? title : "Untitled List"
}

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
  expanded,
  onToggleExpanded,
  onToggle,
  onTitleChange,
  onDescriptionChange,
  onDelete,
  sortableContainerRef,
  dragHandleProps,
}: {
  task: Task
  allComplete: boolean
  expanded: boolean
  onToggleExpanded: (taskId: string) => void
  onToggle: (taskId: string) => void
  onTitleChange: (taskId: string, title: string) => void
  onDescriptionChange: (taskId: string, description: string) => void
  onDelete: (taskId: string) => void
  sortableContainerRef?: (node: HTMLElement | null) => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const checked = task.completed
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function handleDescription(val: string) {
    onDescriptionChange(task.id, val)
    if (descTimer.current) clearTimeout(descTimer.current)
    descTimer.current = setTimeout(async () => {
      await supabase.from("tasks").update({ description: val }).eq("id", task.id)
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
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 8,
        boxShadow: checked
          ? allComplete
            ? "0 6px 20px rgba(234,179,8,0.35), 0 0 0 1px rgba(234,179,8,0.1)"
            : "0 6px 20px rgba(34,197,94,0.28), 0 0 0 1px rgba(34,197,94,0.08)"
          : "0 2px 6px var(--t-p05)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        position: "relative",
      }}
    >
      <button
        type="button"
        {...(dragHandleProps ?? {})}
        style={{
          background: "transparent",
          border: "none",
          cursor: "grab",
          padding: 0,
          lineHeight: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          touchAction: "none",
          marginTop: 3,
          opacity: 0.75,
          flexShrink: 0,
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
          width: 24,
          height: 24,
          borderRadius: 5,
          border: checked ? (allComplete ? "2px solid #eab308" : "2px solid #22c55e") : "2px solid var(--t-bg)",
          background: checked ? (allComplete ? "#eab308" : "#22c55e") : "transparent",
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
          marginTop: 1,
        }}
      >
        {checked && (
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          value={task.title}
          onChange={(e) => handleTitle(e.target.value)}
          placeholder="Task..."
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "inherit",
            fontSize: "0.95rem",
            fontWeight: checked ? 650 : 550,
            color: checked ? (allComplete ? "#a16207" : "#166534") : "var(--t-primary)",
            transition: "color 0.25s",
            padding: 0,
            paddingRight: 58,
            marginBottom: 6,
          }}
        />
        {expanded && (
          <textarea
            value={task.description ?? ""}
            onChange={(e) => handleDescription(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              resize: "vertical",
              background: "rgba(255,255,255,0.55)",
              border: "1.5px solid var(--t-border)",
              borderRadius: 10,
              padding: "8px 10px",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              color: checked ? (allComplete ? "#a16207" : "#166534") : "var(--t-primary)",
              boxSizing: "border-box",
            }}
          />
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: 9,
          right: 10,
          display: "flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <button
          onClick={() => onToggleExpanded(task.id)}
          title={expanded ? "Collapse description" : "Edit description"}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--t-muted)",
            cursor: "pointer",
            padding: "2px 3px",
            lineHeight: 1,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>

        <button
          onClick={() => void handleDelete()}
          className="task-del-btn"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--t-icon)",
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 3px",
            lineHeight: 1,
            opacity: 0,
            transition: "opacity 0.2s, color 0.2s",
          }}
          title="Delete task"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function TaskListDetailPage() {
  const params = useParams<{ listId: string }>()
  const router = useRouter()
  const user = useAppUser()

  const [list, setList] = useState<TaskList | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({})

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [overTaskId, setOverTaskId] = useState<string | null>(null)
  const movedDuringDrag = useRef(false)

  const [isEntering, setIsEntering] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setIsEntering(false), 280)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!params.listId) return
    ;(async () => {
      const { data: foundList } = await supabase
        .from("task_lists")
        .select("*")
        .eq("id", params.listId)
        .eq("user_id", user.id)
        .single()

      if (!foundList) {
        router.replace("/tasks")
        return
      }

      const { data: foundTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("task_list_id", params.listId)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })

      setList(foundList as TaskList)
      setTasks((foundTasks ?? []) as Task[])
      setLoading(false)
    })()
  }, [params.listId, router, user.id])

  const breadcrumbLabel = useMemo(() => (list ? getListLabel(list.title) : ""), [list])

  function handleBack() {
    setIsLeaving(true)
    setTimeout(() => {
      router.push("/tasks")
    }, 230)
  }

  function handleToggle(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)))
  }

  function handleTitleChange(taskId: string, title: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title } : t)))
  }

  function handleDescriptionChange(taskId: string, description: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, description } : t)))
  }

  function handleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setExpandedTaskIds((prev) => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }

  function toggleExpanded(taskId: string) {
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  async function persistOrder(updated: Task[]) {
    try {
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("tasks").update({ sort_order: i }).eq("id", updated[i].id)
      }
    } catch {
      // ignore
    }
  }

  async function addTask() {
    if (!params.listId) return
    const newSortOrder = tasks.length
    const { data } = await supabase
      .from("tasks")
      .insert({
        task_list_id: params.listId,
        user_id: user.id,
        title: "",
        description: null,
        completed: false,
        sort_order: newSortOrder,
      })
      .select()
      .single()
    if (data) setTasks((prev) => [...prev, data as Task])
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const visibleTasks = activeTaskId ? tasks.filter((t) => t.id !== activeTaskId) : tasks
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

    const oldIndex = tasks.findIndex((t) => t.id === activeId)
    const newIndex = overId === TASKS_END_ID ? tasks.length - 1 : tasks.findIndex((t) => t.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const updated = arrayMove(tasks, oldIndex, newIndex)
    setTasks(updated)
    await persistOrder(updated)
  }

  if (loading || !list) return null

  return (
    <>
      <style>{`
        .task-detail-shell {
          transition: transform 240ms ease, opacity 240ms ease;
        }
        .task-detail-enter {
          transform: translateX(36px);
          opacity: 0;
        }
        .task-detail-leave {
          transform: translateX(28px);
          opacity: 0;
        }
        .task-row:hover .task-del-btn {
          opacity: 1 !important;
        }
      `}</style>
      <div
        className={`task-detail-shell ${isEntering ? "task-detail-enter" : ""} ${isLeaving ? "task-detail-leave" : ""}`}
        style={{
          maxWidth: 760,
          margin: "90px auto 0",
          padding: "0 20px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={handleBack}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                color: "var(--t-primary)",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Tasks
            </button>
            <span style={{ color: "var(--t-muted)", fontWeight: 600 }}>{">"}</span>
            <span style={{ color: "var(--t-muted)", fontWeight: 600, fontSize: "0.95rem" }}>{breadcrumbLabel}</span>
          </div>
        </div>

        <DndContext
          sensors={sensors}
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
          <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div>
              {visibleTasks.map((t) => {
                const showPlaceholder = activeTaskId !== null && overTaskId === t.id
                return (
                  <div key={t.id}>
                    {showPlaceholder && (
                      <div
                        className="task-drop-placeholder"
                        style={{
                          minHeight: 88,
                          marginBottom: 8,
                          borderRadius: 12,
                          border: "2px dashed var(--t-p30)",
                          background: "var(--t-p05)",
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                    <SortableTaskRow id={t.id}>
                      {({ setNodeRef, attributes, listeners }) => (
                        <TaskCard
                          task={t}
                          allComplete={allComplete}
                          expanded={expandedTaskIds[t.id] === true}
                          onToggleExpanded={toggleExpanded}
                          onToggle={handleToggle}
                          onTitleChange={handleTitleChange}
                          onDescriptionChange={handleDescriptionChange}
                          onDelete={handleDelete}
                          sortableContainerRef={setNodeRef}
                          dragHandleProps={{ ...attributes, ...listeners }}
                        />
                      )}
                    </SortableTaskRow>
                  </div>
                )
              })}

              {activeTaskId && overTaskId === TASKS_END_ID && (
                <div
                  className="task-drop-placeholder"
                  style={{
                    minHeight: 88,
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
            <div style={{ marginTop: 8, border: "2px dashed var(--t-bg)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <button
                onClick={() => void addTask()}
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
                + Add Task
              </button>
            </div>
          </TasksEndDropSlot>

          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeDragTask ? <TaskDragGhost task={activeDragTask} allComplete={allComplete} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  )
}

