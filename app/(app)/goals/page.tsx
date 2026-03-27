"use client"

import { useEffect, useRef, useState } from "react"
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
import type { GoalSetType } from "../../components/GoalSet"
import CardOverflowMenu from "../../components/CardOverflowMenu"
import { COLORS, resolveColor, spaceCardBackground } from "../../components/ScheduleEvent"
import { useAppUser } from "../layout"

function getDaysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null
  const parts = dateStr.split("T")[0].split("-").map(Number)
  const target = new Date(parts[0], parts[1] - 1, parts[2])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function SpaceDragGhost({ space }: { space: GoalSetType }) {
  const daysLeft = getDaysLeft(space.target_date)
  const label =
    daysLeft === null
      ? "Set deadline"
      : daysLeft === 1
        ? "1 day left"
        : `${daysLeft} days left`
  return (
    <div
      style={{
        textAlign: "center",
        minHeight: 120,
        width: "100%",
        borderRadius: 20,
        border: "1.5px solid var(--t-border)",
        background: spaceCardBackground(space.card_color),
        boxShadow: "0 24px 48px var(--t-p20), 0 8px 16px var(--t-p10)",
        padding: "24px",
        cursor: "grabbing",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        position: "relative",
        opacity: 0.96,
        transform: "rotate(1deg)",
        boxSizing: "border-box"
      }}
    >
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--t-muted)", lineHeight: 1.35, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {space.title || "Untitled Space"}
      </div>
      <div style={{ marginTop: 6, fontSize: "0.95rem", color: "var(--t-muted)", fontWeight: 500, lineHeight: 1.2 }}>
        {label}
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const router = useRouter()
  const user = useAppUser()
  const [spaces, setSpaces] = useState<GoalSetType[]>([])
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null)
  const [overSpaceId, setOverSpaceId] = useState<string | null>(null)
  const movedDuringDrag = useRef(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState("")
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [dateDraft, setDateDraft] = useState("")
  const [deleteConfirmSpaceId, setDeleteConfirmSpaceId] = useState<string | null>(null)
  const [colorMenu, setColorMenu] = useState<{ spaceId: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
      ; (async () => {
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

        setSpaces(combined)
        setLoading(false)
      })()
  }, [user.id])

  useEffect(() => {
    if (!colorMenu) return
    const close = () => setColorMenu(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [colorMenu])

  async function addSpace() {
    const newSortOrder = spaces.length
    const { data: newSet } = await supabase
      .from("goal_sets")
      .insert({ user_id: user.id, title: "New Space", target_date: null, sort_order: newSortOrder })
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

      setSpaces((prev) => [...prev, { ...newSet, goals: newGoal ? [newGoal] : [] }])
    }
  }

  async function saveTitle(spaceId: string) {
    const title = titleDraft.trim()
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, title } : s)))
    await supabase.from("goal_sets").update({ title }).eq("id", spaceId)
    setEditingTitleId(null)
  }

  async function saveDate(spaceId: string) {
    const targetDate = dateDraft || null
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, target_date: targetDate } : s)))
    await supabase.from("goal_sets").update({ target_date: targetDate }).eq("id", spaceId)
    setEditingDateId(null)
  }

  async function deleteSpaceConfirmed(spaceId: string) {
    setSpaces((prev) => prev.filter((s) => s.id !== spaceId))
    await supabase.from("goal_sets").delete().eq("id", spaceId)
    setDeleteConfirmSpaceId(null)
  }

  async function saveSpaceCardColor(spaceId: string, color: string | null) {
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, card_color: color } : s)))
    setColorMenu(null)
    await supabase.from("goal_sets").update({ card_color: color }).eq("id", spaceId)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const visibleSpaces = activeSpaceId ? spaces.filter((s) => s.id !== activeSpaceId) : spaces

  async function persistOrder(updated: GoalSetType[]) {
    try {
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("goal_sets").update({ sort_order: i }).eq("id", updated[i].id)
      }
    } catch {
      // ignore
    }
  }

  function handleDragStart(event: DragStartEvent) {
    movedDuringDrag.current = false
    setActiveSpaceId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.active?.id) return
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId) return
    movedDuringDrag.current = true
    setOverSpaceId(overId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null

    setActiveSpaceId(null)
    setOverSpaceId(null)
    setTimeout(() => {
      movedDuringDrag.current = false
    }, 0)

    if (!overId || activeId === overId) return
    const oldIndex = spaces.findIndex((s) => s.id === activeId)
    const newIndex = overId === "__add_space__"
      ? spaces.length - 1
      : spaces.findIndex((s) => s.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const updated = arrayMove(spaces, oldIndex, newIndex)
    setSpaces(updated)
    await persistOrder(updated)
  }

  if (loading) return null

  const activeDragSpace = activeSpaceId ? spaces.find((s) => s.id === activeSpaceId) : null

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
          setActiveSpaceId(null)
          setOverSpaceId(null)
          setTimeout(() => {
            movedDuringDrag.current = false
          }, 0)
        }}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <SortableContext items={visibleSpaces.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {visibleSpaces.map((space) => {
              const daysLeft = getDaysLeft(space.target_date)
              const showPlaceholder = activeSpaceId !== null && overSpaceId === space.id
              const label =
                daysLeft === null
                  ? "Set deadline"
                  : daysLeft === 1
                    ? "1 day left"
                    : `${daysLeft} days left`
              return (
                <div key={space.id} style={{ display: "contents" }}>
                  {showPlaceholder && (
                    <div
                      className="space-drop-placeholder"
                      style={{
                        minHeight: 120,
                        borderRadius: 20,
                        border: "2px dashed var(--t-p30)",
                        background: "var(--t-p05)",
                      }}
                    />
                  )}
                  <SortableSpaceCard
                    id={space.id}
                    onClick={() => {
                      if (movedDuringDrag.current || editingTitleId === space.id || editingDateId === space.id) return
                      router.push(`/goals/${space.id}`)
                    }}
                  >
                    <div
                      className="space-card"
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setColorMenu({ spaceId: space.id, x: e.clientX, y: e.clientY })
                      }}
                      style={{
                        textAlign: "center",
                        minHeight: 120,
                        borderRadius: 20,
                        border: "1.5px solid var(--t-border)",
                        background: spaceCardBackground(space.card_color),
                        boxShadow: "0 8px 20px var(--t-p08)",
                        padding: "24px",
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
                        boxSizing: "border-box"
                      }}
                    >
                      {editingTitleId === space.id ? (
                        <input
                          value={titleDraft}
                          onChange={(e) => setTitleDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onBlur={() => void saveTitle(space.id)}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === "Enter") {
                              e.preventDefault()
                              void saveTitle(space.id)
                            }
                            if (e.key === "Escape") {
                              setEditingTitleId(null)
                            }
                          }}
                          autoFocus
                          style={{
                            fontSize: "1.75rem",
                            fontWeight: 800,
                            color: "var(--t-primary)",
                            lineHeight: 1.35,
                            border: "1px solid var(--t-input-border)",
                            borderRadius: 8,
                            padding: "4px 8px",
                            background: "#fff",
                            outline: "none",
                            fontFamily: "inherit",
                            width: "100%",
                            textAlign: "center",
                            boxSizing: "border-box"
                          }}
                        />
                      ) : (
                        <div
                          className="space-title"
                          style={{
                            fontSize: "1.75rem",
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
                          {space.title || "Untitled Space"}
                        </div>
                      )}
                      
                      <div style={{ marginTop: 6, position: "relative", display: "flex", justifyContent: "center" }}>
                        <span
                          className="space-date-label"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingDateId(space.id)
                            setDateDraft(space.target_date ? space.target_date.split("T")[0] : "")
                          }}
                          style={{
                            fontSize: "0.95rem",
                            color: "var(--t-muted)",
                            fontWeight: 500,
                            transition: "color 0.18s ease",
                            display: "inline-block",
                            lineHeight: 1.2,
                          }}
                        >
                          {label}
                        </span>
                        {editingDateId === space.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              marginTop: 6,
                              zIndex: 25,
                              padding: 8,
                              borderRadius: 10,
                              border: "1px solid var(--t-border)",
                              background: "#fff",
                              boxShadow: "0 8px 20px var(--t-p12)",
                            }}
                          >
                            <input
                              type="date"
                              value={dateDraft}
                              onChange={async (e) => {
                                const val = e.target.value
                                setDateDraft(val)
                                setSpaces((prev) => prev.map((s) => (s.id === space.id ? { ...s, target_date: val || null } : s)))
                                await supabase.from("goal_sets").update({ target_date: val || null }).eq("id", space.id)
                              }}
                              onBlur={() => setEditingDateId(null)}
                              onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === "Enter" || e.key === "Escape") {
                                  e.preventDefault()
                                  setEditingDateId(null)
                                }
                              }}
                              autoFocus
                              style={{
                                border: "1px solid var(--t-input-border)",
                                borderRadius: 8,
                                padding: "6px 8px",
                                fontFamily: "inherit",
                                color: "var(--t-primary)",
                                fontSize: "0.82rem",
                                outline: "none",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {editingTitleId !== space.id && (
                        <CardOverflowMenu
                          offsetTop={16}
                          offsetRight={16}
                          ariaLabel="Space actions"
                          onRename={() => {
                            setEditingTitleId(space.id)
                            setTitleDraft(space.title || "")
                          }}
                          onDelete={() => setDeleteConfirmSpaceId(space.id)}
                        />
                      )}
                    </div>
                  </SortableSpaceCard>
                </div>
              )
            })}
            {activeSpaceId && overSpaceId === "__add_space__" && (
              <div
                className="space-drop-placeholder"
                style={{
                  minHeight: 120,
                  borderRadius: 20,
                  border: "2px dashed var(--t-p30)",
                  background: "var(--t-p05)",
                }}
              />
            )}

            <AddSpaceDropSlot>
              <div
                className="add-space-slot"
                style={{
                  width: "100%",
                  minHeight: 120,
                  boxSizing: "border-box",
                  padding: "24px",
                  borderRadius: 20,
                  border: "2px dashed var(--t-p30)",
                  background: "transparent",
                  color: "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: "1.2rem",
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
                  onClick={addSpace}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    ; (e.currentTarget as HTMLButtonElement).style.color = "var(--t-primary)"
                  }}
                  onMouseLeave={(e) => {
                    ; (e.currentTarget as HTMLButtonElement).style.color = "var(--t-muted)"
                  }}
                  title="Add Space"
                >
                  + Add Space
                </button>
              </div>
            </AddSpaceDropSlot>
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeDragSpace ? <SpaceDragGhost space={activeDragSpace} /> : null}
        </DragOverlay>
      </DndContext>

      <style>{`
        .space-card:hover {
          box-shadow: 0 12px 26px var(--t-p12);
        }
        .space-card:hover .card-overflow-trigger {
          opacity: 1 !important;
        }
        .space-title:hover,
        .space-date-label:hover {
          font-weight: 800 !important;
          color: var(--t-primary) !important;
        }
      `}</style>

      {colorMenu && (() => {
        const menuSpace = spaces.find((s) => s.id === colorMenu.spaceId)
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
                const current = menuSpace?.card_color
                const picked = current != null && current !== "" && resolveColor(current) === resolveColor(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void saveSpaceCardColor(colorMenu.spaceId, c)}
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
              onClick={() => void saveSpaceCardColor(colorMenu.spaceId, null)}
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

      {deleteConfirmSpaceId && (
        <div
          onClick={() => setDeleteConfirmSpaceId(null)}
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
            <p style={{ margin: "0 0 6px", color: "var(--t-primary)", fontWeight: 700, fontSize: "0.95rem" }}>Delete this space?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setDeleteConfirmSpaceId(null)}
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
                onClick={() => void deleteSpaceConfirmed(deleteConfirmSpaceId)}
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
    </div>
  )
}

function SortableSpaceCard({
  id,
  onClick,
  children,
}: {
  id: string
  onClick: () => void
  children: React.ReactNode
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

function AddSpaceDropSlot({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "__add_space__" })
  return (
    <div
      ref={setNodeRef}
      style={{
        width: "100%",
        minWidth: 0,
        minHeight: 120,
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
