"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import ScheduleGrid from "../../components/ScheduleGrid"
import EventEditor from "../../components/EventEditor"
import { CAL_ALL_HOURS, type ScheduleEventType, type EventEntry } from "../../components/ScheduleEvent"
import { useAppUser } from "../layout"

function getToday() {
  return new Date().toISOString().split("T")[0]
}

type ContextMenu = { event: ScheduleEventType; x: number; y: number }

type EditorState = {
  event: ScheduleEventType | null
  defaultHour: number
}

export default function SchedulePage() {
  const user = useAppUser()
  const [events, setEvents] = useState<ScheduleEventType[]>([])
  const [entries, setEntries] = useState<EventEntry[]>([])
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const today = getToday()

  useEffect(() => {
    Promise.all([
      supabase.from("schedule_events").select("*").eq("user_id", user.id),
      supabase
        .from("schedule_event_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", today),
    ]).then(([{ data: evts }, { data: ents }]) => {
      const sorted = ((evts ?? []) as ScheduleEventType[]).sort(
        (a, b) => CAL_ALL_HOURS.indexOf(a.start_hour) - CAL_ALL_HOURS.indexOf(b.start_hour)
      )
      setEvents(sorted)
      setEntries((ents ?? []) as EventEntry[])
      setLoading(false)
    })
  }, [user.id, today])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [contextMenu])

  async function handleSave(data: Omit<ScheduleEventType, "id" | "user_id">, id?: string) {
    setEditor(null)
    if (id) {
      const { data: updated } = await supabase
        .from("schedule_events")
        .update(data)
        .eq("id", id)
        .select()
        .single()
      if (updated) {
        setEvents((prev) =>
          prev
            .map((e) => (e.id === id ? (updated as ScheduleEventType) : e))
            .sort((a, b) => CAL_ALL_HOURS.indexOf(a.start_hour) - CAL_ALL_HOURS.indexOf(b.start_hour))
        )
      }
    } else {
      const { data: created } = await supabase
        .from("schedule_events")
        .insert({ ...data, user_id: user.id })
        .select()
        .single()
      if (created) {
        setEvents((prev) =>
          [...prev, created as ScheduleEventType].sort(
            (a, b) => CAL_ALL_HOURS.indexOf(a.start_hour) - CAL_ALL_HOURS.indexOf(b.start_hour)
          )
        )
      }
    }
  }

  async function handleDelete(id: string) {
    setEditor(null)
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setEntries((prev) => prev.filter((e) => e.event_id !== id))
    await supabase.from("schedule_events").delete().eq("id", id)
  }

  async function handleSetStatus(eventId: string, status: "completed" | "skipped" | null) {
    const existing = entries.find((e) => e.event_id === eventId)
    if (status === null) {
      setEntries((prev) => prev.filter((e) => e.event_id !== eventId))
      if (existing) {
        await supabase.from("schedule_event_entries").delete().eq("event_id", eventId).eq("entry_date", today)
      }
    } else {
      const optimistic: EventEntry = {
        ...existing,
        event_id: eventId,
        user_id: user.id,
        entry_date: today,
        status,
      }
      setEntries((prev) =>
        existing ? prev.map((e) => (e.event_id === eventId ? optimistic : e)) : [...prev, optimistic]
      )
      await supabase.from("schedule_event_entries").upsert(
        { event_id: eventId, user_id: user.id, entry_date: today, status },
        { onConflict: "event_id,entry_date" }
      )
    }
    setEditor((prev) => prev)
  }

  function startReset() {
    const anySet = entries.some((e) => e.status !== null)
    if (!anySet) return
    setResetting(true)
    resetTimer.current = setTimeout(async () => {
      setEntries([])
      setResetting(false)
      await supabase
        .from("schedule_event_entries")
        .delete()
        .eq("user_id", user.id)
        .eq("entry_date", today)
    }, 1000)
  }

  function cancelReset() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setResetting(false)
  }

  const allComplete =
    events.length > 0 && events.every((e) => entries.find((en) => en.event_id === e.id)?.status === "completed")

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  if (loading) return null

  return (
    <>
      <div style={{ maxWidth: 760, margin: "32px auto 0", padding: "0 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#5a7a99", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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

        <ScheduleGrid
          events={events}
          entries={entries}
          allComplete={allComplete}
          onGridClick={(hour) => setEditor({ event: null, defaultHour: hour })}
          onEventEdit={(evt) => setEditor({ event: evt, defaultHour: evt.start_hour })}
          onEventContextMenu={(evt, x, y) => setContextMenu({ event: evt, x, y })}
        />
      </div>

      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "#f4f9fc",
            borderRadius: 10,
            padding: 4,
            boxShadow: "0 8px 24px rgba(47,102,144,0.2)",
            border: "1.5px solid #c8dfe9",
            zIndex: 1000,
            minWidth: 150,
          }}
        >
          {(["completed", "skipped", null] as const).map((s) => {
            const label = s === null ? "Clear Status" : s.charAt(0).toUpperCase() + s.slice(1)
            const color = s === "completed" ? "#166534" : s === "skipped" ? "#c0392b" : "#5a7a99"
            return (
              <div
                key={String(s)}
                onClick={() => {
                  handleSetStatus(contextMenu.event.id, s)
                  setContextMenu(null)
                }}
                style={{
                  padding: "9px 14px",
                  fontSize: 14,
                  cursor: "pointer",
                  borderRadius: 6,
                  color,
                  fontWeight: 500,
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(47,102,144,0.06)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
              >
                {label}
              </div>
            )
          })}
          <div
            onClick={() => {
              handleDelete(contextMenu.event.id)
              setContextMenu(null)
            }}
            style={{
              padding: "9px 14px",
              fontSize: 14,
              cursor: "pointer",
              borderRadius: 6,
              color: "#c0392b",
              fontWeight: 500,
              borderTop: "1px solid #d8eaf3",
              marginTop: 2,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(192,57,43,0.08)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
          >
            Delete
          </div>
        </div>
      )}

      {editor && (
        <EventEditor
          event={editor.event}
          defaultHour={editor.defaultHour}
          entry={editor.event ? entries.find((e) => e.event_id === editor.event!.id) : undefined}
          userId={user.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onSetStatus={handleSetStatus}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  )
}
