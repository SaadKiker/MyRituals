"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
} from "@dnd-kit/core"
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { applySequentialSortOrders } from "../../lib/persistSortOrder"
import { supabase } from "../../lib/supabase"
import type { Task, TaskList } from "../../lib/types"
import CardOverflowMenu from "../../components/CardOverflowMenu"
import { COLORS, resolveColor, spaceCardBackground } from "../../components/ScheduleEvent"
import TaskListPanel from "../../components/TaskListPanel"
import RemindersPanel from "../../components/RemindersPanel"
import { useAppUser } from "../layout"

const ADD_LIST_ID = "__add_list__"
const REMINDERS_ID = "reminders"

function ListDragGhost({ list }: { list: TaskList }) {
  return (
    <div
      style={{
        textAlign: "center",
        minHeight: 96,
        width: "100%",
        borderRadius: 18,
        border: "1.5px solid var(--t-border)",
        background: spaceCardBackground(list.card_color),
        boxShadow: "0 24px 48px var(--t-p20), 0 8px 16px var(--t-p10)",
        padding: "20px",
        cursor: "grabbing",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        position: "relative",
        opacity: 0.96,
        transform: "rotate(1deg)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "1.55rem",
          fontWeight: 800,
          color: "var(--t-muted)",
          lineHeight: 1.35,
          width: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {list.title || "Untitled List"}
      </div>
    </div>
  )
}

function SortableListCard({
  id,
  onClick,
  children,
}: {
  id: string
  onClick: () => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {children}
    </div>
  )
}

function AddListDropSlot({ children }: { children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: ADD_LIST_ID })
  return (
    <div
      ref={setNodeRef}
      style={{
        width: "100%",
        minWidth: 0,
        minHeight: 96,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "stretch",
      }}
    >
      {children}
    </div>
  )
}

export default function TasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAppUser()
  const [lists, setLists] = useState<TaskList[]>([])
  const [loading, setLoading] = useState(true)
  const listsInitialized = useRef(false)

  const [tasksByList, setTasksByList] = useState<Record<string, Task[]>>({})
  const tasksByListRef = useRef<Record<string, Task[]>>({})
  useLayoutEffect(() => {
    tasksByListRef.current = tasksByList
  })

  const [draggingListId, setDraggingListId] = useState<string | null>(null)
  const [overListId, setOverListId] = useState<string | null>(null)
  const movedDuringDrag = useRef(false)

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState("")
  const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null)
  const [colorMenu, setColorMenu] = useState<{ listId: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (listsInitialized.current) return
    listsInitialized.current = true
    ;(async () => {
      const { data } = await supabase
        .from("task_lists")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
      setLists((data as TaskList[]) ?? [])
      setLoading(false)
    })()
  }, [user.id])

  const selectedListId = useMemo(() => {
    const q = searchParams.get("list")
    if (!q) return REMINDERS_ID
    if (q === REMINDERS_ID) return REMINDERS_ID
    if (!lists.length) return REMINDERS_ID
    if (lists.some((l) => l.id === q)) return q
    return REMINDERS_ID
  }, [lists, searchParams])

  useEffect(() => {
    if (loading) return
    const q = searchParams.get("list")
    if (!q || q === REMINDERS_ID) return
    if (!lists.some((l) => l.id === q)) {
      router.replace("/tasks", { scroll: false })
    }
  }, [lists, loading, searchParams, router])

  useEffect(() => {
    if (!colorMenu) return
    const close = () => setColorMenu(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [colorMenu])

  useEffect(() => {
    if (!selectedListId || selectedListId === REMINDERS_ID) return
    if (tasksByListRef.current[selectedListId] !== undefined) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("task_list_id", selectedListId)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
      if (cancelled) return
      setTasksByList((prev) => ({ ...prev, [selectedListId]: (data ?? []) as Task[] }))
    })()
    return () => {
      cancelled = true
    }
  }, [selectedListId, user.id])

  const prefetchTasks = useCallback((listId: string) => {
    if (tasksByListRef.current[listId] !== undefined) return
    void supabase
      .from("tasks")
      .select("*")
      .eq("task_list_id", listId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setTasksByList((prev) => {
          if (prev[listId] !== undefined) return prev
          return { ...prev, [listId]: (data ?? []) as Task[] }
        })
      })
  }, [user.id])

  function selectList(listId: string) {
    router.replace(`/tasks?list=${listId}`, { scroll: false })
  }

  const patchTasksForList = useCallback((listId: string, updater: Task[] | ((prev: Task[]) => Task[])) => {
    setTasksByList((prev) => {
      const current = prev[listId] ?? []
      const next = typeof updater === "function" ? updater(current) : updater
      return { ...prev, [listId]: next }
    })
  }, [])

  async function persistOrder(updated: TaskList[]) {
    try {
      await applySequentialSortOrders(updated, async (id, sortOrder) =>
        supabase.from("task_lists").update({ sort_order: sortOrder }).eq("id", id),
      )
    } catch {
      // ignore
    }
  }

  async function addList() {
    const newSortOrder = lists.length
    const { data } = await supabase
      .from("task_lists")
      .insert({ user_id: user.id, title: "", sort_order: newSortOrder })
      .select()
      .single()
    if (data) {
      const row = data as TaskList
      setLists((prev) => [...prev, row])
      setTasksByList((prev) => ({ ...prev, [row.id]: [] }))
      selectList(row.id)
      setEditingTitleId(row.id)
      setTitleDraft("")
    }
  }

  async function saveTitle(listId: string) {
    const title = titleDraft.trim()
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, title } : l)))
    await supabase.from("task_lists").update({ title }).eq("id", listId)
    setEditingTitleId(null)
  }

  async function deleteListConfirmed(listId: string) {
    const remaining = lists.filter((l) => l.id !== listId)
    setLists(remaining)
    setTasksByList((prev) => {
      const next = { ...prev }
      delete next[listId]
      return next
    })
    await supabase.from("task_lists").delete().eq("id", listId)
    setDeleteConfirmListId(null)
    if (selectedListId === listId) {
      if (remaining.length) selectList(remaining[0].id)
      else router.replace("/tasks", { scroll: false })
    }
  }

  async function saveListCardColor(listId: string, color: string | null) {
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, card_color: color } : l)))
    setColorMenu(null)
    await supabase.from("task_lists").update({ card_color: color }).eq("id", listId)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const visibleLists = draggingListId ? lists.filter((l) => l.id !== draggingListId) : lists
  const activeDragList = draggingListId ? lists.find((l) => l.id === draggingListId) : null

  function handleDragStart(event: DragStartEvent) {
    movedDuringDrag.current = false
    setDraggingListId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.active?.id) return
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId) return
    movedDuringDrag.current = true
    setOverListId(overId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null

    setDraggingListId(null)
    setOverListId(null)
    setTimeout(() => {
      movedDuringDrag.current = false
    }, 0)

    if (!overId || activeId === overId) return
    const oldIndex = lists.findIndex((l) => l.id === activeId)
    const newIndex = overId === ADD_LIST_ID ? lists.length - 1 : lists.findIndex((l) => l.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const updated = arrayMove(lists, oldIndex, newIndex)
    setLists(updated)
    await persistOrder(updated)
  }

  const panelTasks = selectedListId ? tasksByList[selectedListId] : undefined
  const panelLoading = Boolean(selectedListId && panelTasks === undefined)

  if (loading) return null

  return (
    <div
      className="tasks-split"
      style={{
        maxWidth: 1100,
        margin: "90px auto 0",
        padding: "0 20px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: 24,
      }}
    >
      <aside
        style={{
          flex: "0 0 280px",
          minWidth: 0,
          position: "sticky",
          top: 88,
          alignSelf: "flex-start",
        }}
      >
        {/* Pinned Reminders entry — compact row, visually distinct from list cards */}
        <div
          onClick={() => selectList(REMINDERS_ID)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              selectList(REMINDERS_ID)
            }
          }}
          style={{
            marginBottom: 10,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "11px 16px",
            borderRadius: 12,
            border: "1.5px solid var(--t-primary)",
            background: "var(--t-primary)",
            boxShadow: selectedListId === REMINDERS_ID ? "0 6px 18px var(--t-p25)" : "0 2px 10px var(--t-p15)",
            color: "#fff",
            opacity: selectedListId === REMINDERS_ID ? 1 : 0.75,
            fontFamily: "inherit",
            transition: "background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: 0.8 }}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.01em" }}>
            Reminders
          </span>
        </div>

        <div style={{ margin: "2px 4px 12px", height: 1, background: "var(--t-border)", borderRadius: 1 }} />

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={() => {
            setDraggingListId(null)
            setOverListId(null)
            setTimeout(() => {
              movedDuringDrag.current = false
            }, 0)
          }}
          onDragEnd={(e) => void handleDragEnd(e)}
        >
          <SortableContext items={visibleLists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {visibleLists.map((list) => {
                const showPlaceholder = draggingListId !== null && overListId === list.id
                const isSelected = list.id === selectedListId
                const isDimmed = !isSelected && editingTitleId !== list.id
                return (
                  <div key={list.id} style={{ display: "contents" }}>
                    {showPlaceholder && (
                      <div
                        className="tasklist-drop-placeholder"
                        style={{
                          minHeight: 96,
                          borderRadius: 18,
                          border: "2px dashed var(--t-p30)",
                          background: "var(--t-p05)",
                        }}
                      />
                    )}

                    <SortableListCard
                      id={list.id}
                      onClick={() => {
                        if (movedDuringDrag.current || editingTitleId === list.id) return
                        selectList(list.id)
                      }}
                    >
                      <div
                        className={`tasklist-card ${isSelected ? "tasklist-card--selected" : ""} ${isDimmed ? "tasklist-card--dim" : ""}`}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setColorMenu({ listId: list.id, x: e.clientX, y: e.clientY })
                        }}
                        onMouseEnter={() => prefetchTasks(list.id)}
                        style={{
                          textAlign: "center",
                          minHeight: 96,
                          borderRadius: 18,
                          border: isSelected ? "2px solid var(--t-primary)" : "1.5px solid var(--t-border)",
                          background: spaceCardBackground(list.card_color),
                          boxShadow: isSelected ? "0 10px 28px var(--t-p12)" : "0 8px 20px var(--t-p08)",
                          padding: "20px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: "scale(1)",
                          fontFamily: "inherit",
                          position: "relative",
                          boxSizing: "border-box",
                        }}
                      >
                        {editingTitleId === list.id ? (
                          <input
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onBlur={() => void saveTitle(list.id)}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === "Enter") {
                                e.preventDefault()
                                void saveTitle(list.id)
                              }
                              if (e.key === "Escape") setEditingTitleId(null)
                            }}
                            autoFocus
                            style={{
                              fontSize: "1.55rem",
                              fontWeight: 800,
                              color: "var(--t-primary)",
                              lineHeight: 1.35,
                              border: "1px solid var(--t-input-border)",
                              borderRadius: 10,
                              padding: "6px 10px",
                              background: "#fff",
                              outline: "none",
                              fontFamily: "inherit",
                              width: "100%",
                              textAlign: "center",
                              boxSizing: "border-box",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              fontSize: "1.55rem",
                              fontWeight: 800,
                              color: "var(--t-muted)",
                              lineHeight: 1.35,
                              maxWidth: "100%",
                              transition: "color 0.18s ease",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {list.title || "Untitled List"}
                          </div>
                        )}

                        {editingTitleId !== list.id && (
                          <CardOverflowMenu
                            ariaLabel="List actions"
                            onRename={() => {
                              setEditingTitleId(list.id)
                              setTitleDraft(list.title || "")
                            }}
                            onDelete={() => setDeleteConfirmListId(list.id)}
                          />
                        )}
                      </div>
                    </SortableListCard>
                  </div>
                )
              })}

              {draggingListId && overListId === ADD_LIST_ID && (
                <div
                  className="tasklist-drop-placeholder"
                  style={{
                    minHeight: 96,
                    borderRadius: 18,
                    border: "2px dashed var(--t-p30)",
                    background: "var(--t-p05)",
                  }}
                />
              )}

              <AddListDropSlot>
                <div
                  style={{
                    width: "100%",
                    minHeight: 96,
                    boxSizing: "border-box",
                    padding: "20px",
                    borderRadius: 18,
                    border: "2px dashed var(--t-p30)",
                    background: "transparent",
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                >
                  <button
                    onClick={addList}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--t-muted)",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.color = "var(--t-primary)"
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.color = "var(--t-muted)"
                    }}
                    title="Add List"
                  >
                    + Add List
                  </button>
                </div>
              </AddListDropSlot>
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeDragList ? <ListDragGhost list={activeDragList} /> : null}
          </DragOverlay>
        </DndContext>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
        {selectedListId === REMINDERS_ID ? (
          <RemindersPanel userId={user.id} />
        ) : !lists.length ? (
          <p style={{ color: "var(--t-muted)", fontSize: "0.95rem", margin: 0 }}>No lists yet. Add one from the sidebar.</p>
        ) : selectedListId ? (
          panelLoading ? null : panelTasks !== undefined ? (
            <TaskListPanel
              key={selectedListId}
              listId={selectedListId}
              userId={user.id}
              tasks={panelTasks}
              onTasksChange={(updater) => patchTasksForList(selectedListId, updater)}
            />
          ) : null
        ) : null}
      </main>

      <style>{`
        .tasklist-card {
          transition: box-shadow 0.2s, border-color 0.2s, background 0.2s, opacity 0.22s ease;
        }
        .tasklist-card--dim {
          opacity: 0.62;
          filter: saturate(0.9);
        }
        .tasklist-card--dim:hover {
          opacity: 0.9;
          filter: none;
        }
        .tasklist-card--selected {
          opacity: 1;
        }
        .tasklist-card:hover {
          box-shadow: 0 12px 26px var(--t-p12);
        }
        .tasklist-card:hover .card-overflow-trigger {
          opacity: 1 !important;
        }
        @media (max-width: 820px) {
          .tasks-split {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .tasks-split aside {
            position: relative !important;
            top: auto !important;
            flex: 1 1 auto !important;
            width: 100% !important;
          }
        }
      `}</style>

      {deleteConfirmListId && (
        <div
          onClick={() => setDeleteConfirmListId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(24, 39, 61, 0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 320,
              background: "var(--t-panel)",
              borderRadius: 14,
              border: "1px solid var(--t-border)",
              boxShadow: "0 20px 40px var(--t-p20)",
              padding: 16,
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 6px", color: "var(--t-primary)", fontWeight: 700, fontSize: "0.95rem" }}>
              Delete this list?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setDeleteConfirmListId(null)}
                style={{
                  border: "1px solid var(--t-p20)",
                  background: "transparent",
                  color: "var(--t-muted)",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void deleteListConfirmed(deleteConfirmListId)}
                style={{
                  border: "none",
                  background: "#d92d20",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {colorMenu && (() => {
        const menuList = lists.find((l) => l.id === colorMenu.listId)
        const vw = typeof window !== "undefined" ? window.innerWidth : 400
        const vh = typeof window !== "undefined" ? window.innerHeight : 600
        const panelW = 188
        const panelH = 200
        const left = Math.max(8, Math.min(colorMenu.x, vw - panelW - 8))
        const top = Math.max(8, Math.min(colorMenu.y, vh - panelH - 8))
        return (
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left,
              top,
              zIndex: 150,
              background: "var(--t-panel)",
              border: "1px solid var(--t-border)",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 12px 32px var(--t-p20)",
              width: panelW,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--t-muted)",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Card color
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                justifyItems: "center",
              }}
            >
              {COLORS.map((c) => {
                const current = menuList?.card_color
                const picked = current != null && current !== "" && resolveColor(current) === resolveColor(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void saveListCardColor(colorMenu.listId, c)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: picked ? "2.5px solid var(--t-primary)" : "2px solid var(--t-input-border)",
                      background: spaceCardBackground(c),
                      cursor: "pointer",
                      padding: 0,
                      boxSizing: "border-box",
                    }}
                    title={`Use ${c}`}
                  />
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => void saveListCardColor(colorMenu.listId, null)}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "8px 0",
                borderRadius: 8,
                border: "1px solid var(--t-p20)",
                background: "transparent",
                color: "var(--t-muted)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Default
            </button>
          </div>
        )
      })()}
    </div>
  )
}
