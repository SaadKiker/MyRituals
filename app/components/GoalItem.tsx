"use client"

import { useEffect, useRef, useState, type HTMLAttributes } from "react"
import { supabase } from "../lib/supabase"
import CardOverflowMenu from "./CardOverflowMenu"

export type Goal = {
  id: string
  goal_set_id: string
  user_id: string
  title: string
  current_value: number
  target_value: number
  sort_order: number
}

type Props = {
  goal: Goal
  allComplete: boolean
  onDelete: (id: string) => void
  onUpdate: (updated: Goal) => void
  sortableContainerRef?: (node: HTMLElement | null) => void
  dragHandleProps?: HTMLAttributes<HTMLDivElement>
}

export default function GoalItem({ goal, allComplete, onDelete, onUpdate, sortableContainerRef, dragHandleProps }: Props) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [current, setCurrent] = useState(goal.current_value)
  const [target, setTarget] = useState(goal.target_value)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus()
  }, [editingTitle])

  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const done = target > 0 && current >= target

  async function saveValues(newCurrent: number, newTarget: number) {
    const updated = { ...goal, current_value: newCurrent, target_value: newTarget }
    onUpdate(updated)
    await supabase.from("goals").update({ current_value: newCurrent, target_value: newTarget }).eq("id", goal.id)
  }

  async function flushTitleSave(val: string) {
    if (titleTimer.current) {
      clearTimeout(titleTimer.current)
      titleTimer.current = null
    }
    const updated = { ...goal, title: val }
    onUpdate(updated)
    await supabase.from("goals").update({ title: val }).eq("id", goal.id)
  }

  async function scheduleTitleSave(val: string) {
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => flushTitleSave(val), 600)
  }

  async function handleDelete() {
    onDelete(goal.id)
    await supabase.from("goals").delete().eq("id", goal.id)
  }

  const cardStyle: React.CSSProperties = {
    background: done
      ? allComplete
        ? "#fef9c3"
        : "#dcfce7"
      : "#fff",
    borderRadius: 12,
    padding: "16px 18px",
    marginBottom: 10,
    border: done
      ? allComplete
        ? "2px solid rgba(234,179,8,0.6)"
        : "2px solid rgba(34,197,94,0.5)"
      : "1.5px solid var(--t-border)",
    boxShadow: done
      ? allComplete
        ? "0 6px 20px rgba(234,179,8,0.35), 0 0 0 1px rgba(234,179,8,0.1)"
        : "0 6px 20px rgba(34,197,94,0.28), 0 0 0 1px rgba(34,197,94,0.08)"
      : "0 2px 8px var(--t-p06)",
    position: "relative",
    transition: "box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease",
  }

  return (
    <div style={cardStyle} className="goal-card" ref={sortableContainerRef}>
      {!editingTitle && (
        <CardOverflowMenu
          offsetTop={12}
          offsetRight={12}
          ariaLabel="Goal actions"
          onRename={() => {
            setTitleDraft(goal.title)
            setEditingTitle(true)
          }}
          onDelete={handleDelete}
        />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          paddingRight: 4,
        }}
      >
        <div
          {...dragHandleProps}
          style={{
            marginRight: 8,
            color: "var(--t-icon)",
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            opacity: 0.5,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="var(--t-icon)">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </div>
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => {
              const v = e.target.value
              setTitleDraft(v)
              void scheduleTitleSave(v)
            }}
            onBlur={() => {
              void flushTitleSave(titleDraft)
              setEditingTitle(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault()
                if (titleTimer.current) {
                  clearTimeout(titleTimer.current)
                  titleTimer.current = null
                }
                setEditingTitle(false)
              }
              if (e.key === "Enter") {
                e.preventDefault()
                void flushTitleSave(titleDraft)
                setEditingTitle(false)
              }
            }}
            placeholder="Goal name..."
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "var(--t-primary)",
              fontFamily: "inherit",
              padding: "2px 0",
              marginRight: 8,
              outline: "none",
            }}
          />
        ) : (
          <div
            style={{
              flex: 1,
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "var(--t-primary)",
              fontFamily: "inherit",
              padding: "2px 0",
              marginRight: 8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {goal.title.trim() ? goal.title : <span style={{ color: "var(--t-muted)" }}>Goal name…</span>}
          </div>
        )}
      </div>

      <div style={{ background: "var(--t-progress)", height: 7, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 4,
            background: done ? (allComplete ? "#eab308" : "#22c55e") : "var(--t-primary)",
            transition: "width 0.4s cubic-bezier(0.2,0.8,0.2,1)",
            boxShadow: done ? (allComplete ? "0 2px 8px rgba(234,179,8,0.5)" : "0 2px 8px rgba(34,197,94,0.4)") : "none",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="number"
            inputMode="numeric"
            value={current}
            onChange={(e) => setCurrent(parseFloat(e.target.value) || 0)}
            onBlur={() => saveValues(current, target)}
            style={{
              width: 64,
              background: "transparent",
              border: "1px solid var(--t-input-border)",
              borderRadius: 6,
              padding: "5px 6px",
              fontSize: "0.85rem",
              textAlign: "center",
              color: "var(--t-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <span style={{ color: "#99b8cc" }}>/</span>
          <input
            type="number"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
            onBlur={() => saveValues(current, target)}
            style={{
              width: 64,
              background: "transparent",
              border: "1px solid var(--t-input-border)",
              borderRadius: 6,
              padding: "5px 6px",
              fontSize: "0.85rem",
              textAlign: "center",
              color: "var(--t-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>
        <span
          style={{
            fontWeight: done ? 700 : 600,
            fontSize: "0.88rem",
            color: done ? (allComplete ? "#a16207" : "#166534") : "var(--t-muted)",
          }}
        >
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  )
}
