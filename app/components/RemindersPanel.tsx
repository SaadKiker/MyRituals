"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import type { Reminder } from "../lib/types"

function formatDate(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  if (d.getTime() === today.getTime()) return "Today"
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow"
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

function isOverdue(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  return d < today
}

type Props = { userId: string }

export default function RemindersPanel({ userId }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const titleRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  const showDateChip = title.trim().length > 0

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .order("remind_at", { ascending: true })
      setReminders((data as Reminder[]) ?? [])
      setLoading(false)
    })()
  }, [userId])

  async function save(t: string, d: string) {
    if (!t.trim() || !d) return
    const { data } = await supabase
      .from("reminders")
      .insert({ user_id: userId, title: t.trim(), remind_at: d })
      .select()
      .single()
    if (data) {
      setReminders((prev) =>
        [...prev, data as Reminder].sort((a, b) => a.remind_at.localeCompare(b.remind_at))
      )
      setTitle("")
      setDate("")
      titleRef.current?.focus()
    }
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.value
    setDate(d)
    if (title.trim() && d) void save(title, d)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (date && title.trim()) {
        void save(title, date)
      } else {
        dateRef.current?.focus()
        try { dateRef.current?.showPicker() } catch { /* ignore */ }
      }
    }
  }

  async function deleteReminder(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id))
    await supabase.from("reminders").delete().eq("id", id)
  }

  // Group reminders by date
  const groups = reminders.reduce<{ date: string; items: Reminder[] }[]>((acc, r) => {
    const last = acc[acc.length - 1]
    if (last && last.date === r.remind_at) {
      last.items.push(r)
    } else {
      acc.push({ date: r.remind_at, items: [r] })
    }
    return acc
  }, [])

  if (loading) return null

  return (
    <>
      <style>{`
        .reminder-row:hover .reminder-del-btn {
          opacity: 1 !important;
        }
        .reminder-date-input::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Add row — single card, title left, date chip right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--t-panel)",
            border: "1.5px solid var(--t-border)",
            borderRadius: 10,
            padding: "8px 10px 8px 14px",
            marginBottom: 14,
          }}
        >
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Remind me to…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "var(--t-primary)",
              padding: 0,
            }}
          />

          {showDateChip && (
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  background: date ? "var(--t-p15)" : "transparent",
                  color: date ? "var(--t-primary)" : "var(--t-muted)",
                  border: date ? "1px solid var(--t-p20)" : "1px dashed var(--t-border)",
                }}
              >
                {date ? formatDate(date) : "Set date"}
              </span>
              <input
                ref={dateRef}
                type="date"
                value={date}
                onChange={handleDateChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && date && title.trim()) void save(title, date)
                }}
                className="reminder-date-input"
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  margin: 0,
                  border: "none",
                  background: "transparent",
                }}
              />
            </div>
          )}
        </div>

        {/* Grouped reminder list */}
        {groups.map((group, gi) => {
          const overdue = isOverdue(group.date)
          return (
            <div key={group.date} style={{ marginTop: gi > 0 ? 14 : 0 }}>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: overdue ? "rgba(239,68,68,0.65)" : "var(--t-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 5,
                  paddingLeft: 4,
                }}
              >
                {formatDate(group.date)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {group.items.map((r) => (
                  <div
                    key={r.id}
                    className="reminder-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 8px 7px 14px",
                      borderRadius: 8,
                      border: overdue ? "1px solid rgba(239,68,68,0.2)" : "1px solid var(--t-border)",
                      background: overdue ? "#fef2f2" : "var(--t-panel)",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: "0.92rem",
                        fontWeight: 550,
                        color: overdue ? "#b91c1c" : "var(--t-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => void deleteReminder(r.id)}
                      className="reminder-del-btn"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--t-icon)",
                        fontSize: 17,
                        cursor: "pointer",
                        padding: "2px 4px",
                        lineHeight: 1,
                        opacity: 0,
                        transition: "opacity 0.15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                      title="Delete reminder"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {reminders.length === 0 && (
          <p style={{ color: "var(--t-muted)", fontSize: "0.85rem", margin: 0, textAlign: "center" }}>
            No reminders yet.
          </p>
        )}
      </div>
    </>
  )
}
