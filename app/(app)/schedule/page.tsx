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

function buildHoursRange(wakeHour: number, sleepHour: number): number[] {
  const hours: number[] = []
  let h = wakeHour
  while (h !== sleepHour) {
    hours.push(h)
    h = (h + 1) % 24
  }
  hours.push(sleepHour)
  return hours
}

function fmt(h: number) {
  return String(h).padStart(2, "0") + ":00"
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

  const [wakeHour, setWakeHour] = useState(12)
  const [sleepHour, setSleepHour] = useState(6)
  const [showSettings, setShowSettings] = useState(false)
  const [tempWake, setTempWake] = useState(12)
  const [tempSleep, setTempSleep] = useState(6)

  useEffect(() => {
    supabase
      .from("user_preferences")
      .select("wake_hour, sleep_hour")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWakeHour(data.wake_hour)
          setSleepHour(data.sleep_hour)
        }
      })
  }, [user.id])

  const calHours = buildHoursRange(wakeHour, sleepHour)
  const calStartHours = calHours.slice(0, -1)

  function openSettings() {
    setTempWake(wakeHour)
    setTempSleep(sleepHour)
    setShowSettings(true)
  }

  async function applySettings() {
    setWakeHour(tempWake)
    setSleepHour(tempSleep)
    setShowSettings(false)
    await supabase.from("user_preferences").upsert(
      { user_id: user.id, wake_hour: tempWake, sleep_hour: tempSleep },
      { onConflict: "user_id" }
    )
  }

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
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {dateLabel}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            {/* Sleep Hours Button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={openSettings}
                title="Set wake & sleep hours"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--t-input-border)",
                  background: "var(--t-p06)",
                  color: "var(--t-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {fmt(wakeHour)} – {fmt(sleepHour)}
              </button>

              {showSettings && (
                <>
                  <div
                    onClick={() => setShowSettings(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 199 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "var(--t-panel)",
                      border: "1.5px solid var(--t-input-border)",
                      borderRadius: 12,
                      padding: 16,
                      boxShadow: "0 8px 24px var(--t-p18)",
                      zIndex: 200,
                      minWidth: 200,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-primary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Hours
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10, color: "var(--t-time)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Wake</label>
                        <select
                          value={tempWake}
                          onChange={(e) => setTempWake(parseInt(e.target.value))}
                          style={{
                            width: "100%",
                            background: "var(--t-p06)",
                            border: "1.5px solid var(--t-input-border)",
                            borderRadius: 7,
                            padding: "6px 4px",
                            color: "var(--t-primary)",
                            fontSize: 13,
                            fontFamily: "inherit",
                            outline: "none",
                          }}
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                            <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10, color: "var(--t-time)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sleep</label>
                        <select
                          value={tempSleep}
                          onChange={(e) => setTempSleep(parseInt(e.target.value))}
                          style={{
                            width: "100%",
                            background: "var(--t-p06)",
                            border: "1.5px solid var(--t-input-border)",
                            borderRadius: 7,
                            padding: "6px 4px",
                            color: "var(--t-primary)",
                            fontSize: 13,
                            fontFamily: "inherit",
                            outline: "none",
                          }}
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                            <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--t-time)", marginBottom: 12 }}>
                      {buildHoursRange(tempWake, tempSleep).length - 1}h shown
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setShowSettings(false)}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1.5px solid var(--t-input-border)", background: "transparent", color: "var(--t-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applySettings}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", background: "var(--t-primary)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

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
        </div>

        <ScheduleGrid
          events={events}
          entries={entries}
          allComplete={allComplete}
          calHours={calHours}
          calStartHours={calStartHours}
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
            background: "var(--t-panel)",
            borderRadius: 10,
            padding: 4,
            boxShadow: "0 8px 24px var(--t-p20)",
            border: "1.5px solid var(--t-input-border)",
            zIndex: 1000,
            minWidth: 150,
          }}
        >
          {(["completed", "skipped", null] as const).map((s) => {
            const label = s === null ? "Clear Status" : s.charAt(0).toUpperCase() + s.slice(1)
            const color = s === "completed" ? "#166534" : s === "skipped" ? "#c0392b" : "var(--t-muted)"
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
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--t-p06)")}
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
              borderTop: "1px solid var(--t-border)",
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
          calHours={calHours}
          calStartHours={calStartHours}
          onSave={handleSave}
          onDelete={handleDelete}
          onSetStatus={handleSetStatus}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  )
}
