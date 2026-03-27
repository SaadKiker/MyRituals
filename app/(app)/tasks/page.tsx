"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
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
import { supabase } from "../../lib/supabase"
import type { TaskList } from "../../lib/types"
import { COLORS, resolveColor, spaceCardBackground } from "../../components/ScheduleEvent"
import { useAppUser } from "../layout"

const ADD_LIST_ID = "__add_list__"

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
  const user = useAppUser()
  const [lists, setLists] = useState<TaskList[]>([])
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [overListId, setOverListId] = useState<string | null>(null)
  const movedDuringDrag = useRef(false)

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState("")
  const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null)
  const [colorMenu, setColorMenu] = useState<{ listId: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
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

  useEffect(() => {
    if (!colorMenu) return
    const close = () => setColorMenu(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [colorMenu])

  async function persistOrder(updated: TaskList[]) {
    try {
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("task_lists").update({ sort_order: i }).eq("id", updated[i].id)
      }
    } catch {
      // ignore
    }
  }

  async function addList() {
    const newSortOrder = lists.length
    const { data } = await supabase
      .from("task_lists")
      .insert({ user_id: user.id, title: "New List", sort_order: newSortOrder })
      .select()
      .single()
    if (data) setLists((prev) => [...prev, data as TaskList])
  }

  async function saveTitle(listId: string) {
    const title = titleDraft.trim()
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, title } : l)))
    await supabase.from("task_lists").update({ title }).eq("id", listId)
    setEditingTitleId(null)
  }

  async function deleteListConfirmed(listId: string) {
    setLists((prev) => prev.filter((l) => l.id !== listId))
    await supabase.from("task_lists").delete().eq("id", listId)
    setDeleteConfirmListId(null)
  }

  async function saveListCardColor(listId: string, color: string | null) {
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, card_color: color } : l)))
    setColorMenu(null)
    await supabase.from("task_lists").update({ card_color: color }).eq("id", listId)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const visibleLists = activeListId ? lists.filter((l) => l.id !== activeListId) : lists
  const activeDragList = activeListId ? lists.find((l) => l.id === activeListId) : null

  function handleDragStart(event: DragStartEvent) {
    movedDuringDrag.current = false
    setActiveListId(String(event.active.id))
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

    setActiveListId(null)
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

  if (loading) return null

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "90px auto 0",
        padding: "0 20px 20px",
      }}
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={() => {
          setActiveListId(null)
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
              const showPlaceholder = activeListId !== null && overListId === list.id
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
                      router.push(`/tasks/${list.id}`)
                    }}
                  >
                    <div
                      className="tasklist-card"
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setColorMenu({ listId: list.id, x: e.clientX, y: e.clientY })
                      }}
                      style={{
                        textAlign: "center",
                        minHeight: 96,
                        borderRadius: 18,
                        border: "1.5px solid var(--t-border)",
                        background: spaceCardBackground(list.card_color),
                        boxShadow: "0 8px 20px var(--t-p08)",
                        padding: "20px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 1,
                        transform: "scale(1)",
                        transition: "box-shadow 0.2s, border-color 0.2s, background 0.2s",
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
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTitleId(list.id)
                            setTitleDraft(list.title || "")
                          }}
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

                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDeleteConfirmListId(list.id)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          top: 14,
                          right: 14,
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid transparent",
                          background: "transparent",
                          color: "var(--t-muted)",
                          cursor: "pointer",
                          fontSize: 14,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0.38,
                          transition: "opacity 0.2s, color 0.2s",
                        }}
                        title="Delete List"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </SortableListCard>
                </div>
              )
            })}

            {activeListId && overListId === ADD_LIST_ID && (
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

      <style>{`
        .tasklist-card:hover {
          box-shadow: 0 12px 26px var(--t-p12);
        }
        .tasklist-card:hover button[title="Delete List"] {
          opacity: 1;
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

