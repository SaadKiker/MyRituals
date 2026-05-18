"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import ScheduleGrid from "../../components/ScheduleGrid"
import EventEditor from "../../components/EventEditor"
import { CAL_ALL_HOURS, type ScheduleEventType, type EventEntry } from "../../components/ScheduleEvent"
import HabitList from "../../components/HabitList"
import type { Habit, HabitEntry } from "../../components/HabitItem"
import { useAppUser } from "../layout"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Maps JS getDay() (0=Sun) → our index (0=Mon, 6=Sun) */
function getTodayIndex() {
  return (new Date().getDay() + 6) % 7
}

function getToday() {
  return new Date().toISOString().split("T")[0]
}

/** Returns the Mon–Sun dates of the current real week as YYYY-MM-DD strings */
function getWeekDates(): string[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split("T")[0]
  })
}

function formatWeekRange(dates: string[]): string {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const fmt = (d: string) => {
    const [, m, day] = d.split("-").map(Number)
    return `${MONTHS[m - 1]} ${day}`
  }
  const year = dates[0].split("-")[0]
  return `${fmt(dates[0])} – ${fmt(dates[6])}, ${year}`
}

async function generateWeekImage(
  events: ScheduleEventType[],
  weekEntries: EventEntry[],
  weekDates: string[]
): Promise<Blob> {
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 2, 3)
  const W = 440
  const ROW_H = 48
  const H = 100 + 28 + 7 * ROW_H + 72 + 40
  const canvas = document.createElement("canvas")
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`
  const ctx = canvas.getContext("2d")!
  ctx.scale(dpr, dpr)

  const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
  const PAD = 36

  // Background
  ctx.fillStyle = "#fafafa"
  ctx.fillRect(0, 0, W, H)

  // Subtle top accent bar
  ctx.fillStyle = "#e0e7ff"
  ctx.fillRect(0, 0, W, 4)

  // Title
  ctx.font = `bold 21px ${FONT}`
  ctx.fillStyle = "#111827"
  ctx.textAlign = "center"
  ctx.fillText("Weekly Review", W / 2, 46)

  // Date range
  ctx.font = `13px ${FONT}`
  ctx.fillStyle = "#6b7280"
  ctx.fillText(formatWeekRange(weekDates), W / 2, 68)

  // Column x positions (right-aligned anchors)
  const COL = { day: PAD, done: W - PAD - 96, skip: W - PAD }
  const headerY = 100

  ctx.font = `bold 10px ${FONT}`
  ctx.fillStyle = "#9ca3af"
  ctx.textAlign = "left"
  ctx.fillText("DAY", COL.day, headerY)
  ctx.textAlign = "right"
  ctx.fillText("DONE", COL.done, headerY)
  ctx.fillText("SKIPPED", COL.skip, headerY)

  // Header underline
  ctx.strokeStyle = "#e5e7eb"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, headerY + 9)
  ctx.lineTo(W - PAD, headerY + 9)
  ctx.stroke()

  // Day rows
  const startY = 128
  let totalEvents = 0, totalCompleted = 0, totalSkipped = 0

  for (let i = 0; i < 7; i++) {
    const y = startY + i * ROW_H
    const dayEvts = events.filter((e) => e.day_of_week === i)
    const total = dayEvts.length
    const dateStr = weekDates[i]
    const dayEnts = weekEntries.filter((e) => e.entry_date === dateStr)
    const completed = dayEvts.filter((e) => dayEnts.find((en) => en.event_id === e.id)?.status === "completed").length
    const skipped = dayEvts.filter((e) => dayEnts.find((en) => en.event_id === e.id)?.status === "skipped").length

    totalEvents += total
    totalCompleted += completed
    totalSkipped += skipped

    const isSun = i === 6
    const midY = y + ROW_H / 2 + 5

    // Row highlight for Sunday
    if (isSun) {
      ctx.fillStyle = "#f0f4ff"
      ctx.fillRect(PAD - 8, y + 4, W - (PAD - 8) * 2, ROW_H - 4)
    }

    // Day name
    ctx.font = `${isSun ? "bold" : "500"} 13px ${FONT}`
    ctx.fillStyle = isSun ? "#4338ca" : "#374151"
    ctx.textAlign = "left"
    ctx.fillText(DAYS_SHORT[i], COL.day, midY)

    if (total === 0) {
      ctx.font = `13px ${FONT}`
      ctx.fillStyle = "#d1d5db"
      ctx.textAlign = "right"
      ctx.fillText("—", COL.done, midY)
      ctx.fillText("—", COL.skip, midY)
    } else {
      const donePct = Math.round((completed / total) * 100)
      const skipPct = Math.round((skipped / total) * 100)

      // Done
      ctx.font = `bold 14px ${FONT}`
      ctx.fillStyle = donePct >= 80 ? "#16a34a" : donePct >= 50 ? "#2563eb" : "#6b7280"
      ctx.textAlign = "right"
      ctx.fillText(`${donePct}%`, COL.done, midY)

      // Skipped
      ctx.font = `13px ${FONT}`
      ctx.fillStyle = skipPct > 0 ? "#d97706" : "#d1d5db"
      ctx.fillText(skipPct > 0 ? `${skipPct}%` : "—", COL.skip, midY)
    }

    // Row separator (not after last day)
    if (i < 6) {
      ctx.strokeStyle = "#f3f4f6"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PAD, y + ROW_H)
      ctx.lineTo(W - PAD, y + ROW_H)
      ctx.stroke()
    }
  }

  // Total divider
  const totalY = startY + 7 * ROW_H + 14
  ctx.strokeStyle = "#d1d5db"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PAD, totalY)
  ctx.lineTo(W - PAD, totalY)
  ctx.stroke()

  // Total row
  const tMidY = totalY + 36
  const wDone = totalEvents > 0 ? Math.round((totalCompleted / totalEvents) * 100) : 0
  const wSkip = totalEvents > 0 ? Math.round((totalSkipped / totalEvents) * 100) : 0

  ctx.font = `bold 13px ${FONT}`
  ctx.fillStyle = "#111827"
  ctx.textAlign = "left"
  ctx.fillText("Week", COL.day, tMidY)

  ctx.font = `bold 15px ${FONT}`
  ctx.fillStyle = wDone >= 80 ? "#16a34a" : wDone >= 50 ? "#2563eb" : "#6b7280"
  ctx.textAlign = "right"
  ctx.fillText(`${wDone}%`, COL.done, tMidY)

  ctx.font = `13px ${FONT}`
  ctx.fillStyle = wSkip > 0 ? "#d97706" : "#d1d5db"
  ctx.fillText(wSkip > 0 ? `${wSkip}%` : "—", COL.skip, tMidY)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))), "image/png")
  })
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
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([])
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const today = getToday()

  // Day-of-week navigation (0=Monday … 6=Sunday)
  const [dayIndex, setDayIndex] = useState(getTodayIndex)
  const [slideDir, setSlideDir] = useState<"from-right" | "from-left">("from-right")
  const [animKey, setAnimKey] = useState(0)

  const [wakeHour, setWakeHour] = useState(12)
  const [sleepHour, setSleepHour] = useState(6)
  const [showSettings, setShowSettings] = useState(false)
  const [tempWake, setTempWake] = useState(12)
  const [tempSleep, setTempSleep] = useState(6)

  const [weekEntriesCache, setWeekEntriesCache] = useState<EventEntry[] | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

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
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("habit_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", today),
    ]).then(([{ data: evts }, { data: ents }, { data: habitsData }, { data: habitEntriesData }]) => {
      const sorted = ((evts ?? []) as ScheduleEventType[]).sort(
        (a, b) => CAL_ALL_HOURS.indexOf(a.start_hour) - CAL_ALL_HOURS.indexOf(b.start_hour)
      )
      setEvents(sorted)
      setEntries((ents ?? []) as EventEntry[])
      setHabits((habitsData as Habit[]) ?? [])
      setHabitEntries((habitEntriesData as HabitEntry[]) ?? [])
      setLoading(false)
    })
  }, [user.id, today])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [contextMenu])

  function navigateDay(dir: "prev" | "next") {
    if (dir === "prev") {
      setSlideDir("from-left")
      setDayIndex((d) => (d + 6) % 7)
    } else {
      setSlideDir("from-right")
      setDayIndex((d) => (d + 1) % 7)
    }
    setAnimKey((k) => k + 1)
  }

  // Events filtered to the currently-viewed day
  const dayEvents = events.filter((e) => e.day_of_week === dayIndex)

  async function handleSave(data: Omit<ScheduleEventType, "id" | "user_id" | "day_of_week">, id?: string) {
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
        .insert({ ...data, user_id: user.id, day_of_week: dayIndex })
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

  async function resetScheduleStatuses() {
    const anySet = entries.some((e) => e.status !== null)
    if (!anySet) return
    setEntries([])
    await supabase
      .from("schedule_event_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("entry_date", today)
  }

  const allComplete =
    dayEvents.length > 0 &&
    dayEvents.every((e) => entries.find((en) => en.event_id === e.id)?.status === "completed")

  async function handleExportWeek() {
    if (exportLoading) return
    setExportLoading(true)
    try {
      const weekDates = getWeekDates()
      let allWeekEntries = weekEntriesCache
      if (!allWeekEntries) {
        const { data } = await supabase
          .from("schedule_event_entries")
          .select("*")
          .eq("user_id", user.id)
          .in("entry_date", weekDates)
        allWeekEntries = (data ?? []) as EventEntry[]
        setWeekEntriesCache(allWeekEntries)
      }
      const blob = await generateWeekImage(events, allWeekEntries, weekDates)
      const fileName = `weekly-review-${weekDates[0]}.png`
      const file = new File([blob], fileName, { type: "image/png" })
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: "Weekly Review" })
      } else {
        // Fallback: trigger download
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (err) {
      // User cancelled share — not an error worth surfacing
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Export failed:", err)
      }
    } finally {
      setExportLoading(false)
    }
  }

  if (loading) return null

  return (
    <>
      <style>{`
        .habit-row:hover .habit-del-btn {
          opacity: 1 !important;
        }
        @keyframes cardFromRight {
          from { transform: translateX(52px); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes cardFromLeft {
          from { transform: translateX(-52px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .card-enter-right {
          animation: cardFromRight 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .card-enter-left {
          animation: cardFromLeft 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div className="schedule-shell" style={{ margin: "90px auto 0", padding: "0 20px 20px" }}>
        <div className="schedule-split">
          <div className="schedule-left">
            <div className="schedule-calendar">

              <div className="schedule-header">
                {/* Day-of-week navigator */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={() => navigateDay("prev")}
                    title="Previous day"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: "1px solid var(--t-input-border)",
                      background: "var(--t-p06)",
                      color: "var(--t-muted)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--t-primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      minWidth: 90,
                      textAlign: "center",
                      userSelect: "none",
                    }}
                  >
                    {DAYS[dayIndex]}
                  </span>

                  <button
                    onClick={() => navigateDay("next")}
                    title="Next day"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: "1px solid var(--t-input-border)",
                      background: "var(--t-p06)",
                      color: "var(--t-muted)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>

                <div className="schedule-header-controls" style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
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

                  <button
                    onClick={() => void resetScheduleStatuses()}
                    title="Reset schedule statuses"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid rgba(192,57,43,0.32)",
                      background: "rgba(192,57,43,0.08)",
                      color: "#c0392b",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Animated card container */}
              <div style={{ overflow: "hidden" }}>
                <div
                  key={animKey}
                  className={slideDir === "from-right" ? "card-enter-right" : "card-enter-left"}
                >
                  <ScheduleGrid
                    events={dayEvents}
                    entries={entries}
                    allComplete={allComplete}
                    calHours={calHours}
                    calStartHours={calStartHours}
                    onGridClick={(hour) => setEditor({ event: null, defaultHour: hour })}
                    onEventEdit={(evt) => setEditor({ event: evt, defaultHour: evt.start_hour })}
                    onEventContextMenu={(evt, x, y) => setContextMenu({ event: evt, x, y })}
                  />
                </div>
              </div>
            </div>

            {/* Weekly report export — only visible on Sunday, below the calendar */}
            {dayIndex === 6 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  onClick={() => void handleExportWeek()}
                  disabled={exportLoading}
                  title="Export weekly report"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 9,
                    border: "1px solid var(--t-input-border)",
                    background: exportLoading ? "var(--t-p06)" : "var(--t-panel)",
                    color: exportLoading ? "var(--t-muted)" : "var(--t-primary)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: exportLoading ? "default" : "pointer",
                    fontFamily: "inherit",
                    opacity: exportLoading ? 0.6 : 1,
                    transition: "opacity 0.15s, background 0.15s",
                    boxShadow: "0 1px 4px var(--t-p08)",
                  }}
                  onMouseEnter={(e) => {
                    if (!exportLoading) (e.currentTarget as HTMLButtonElement).style.background = "var(--t-p06)"
                  }}
                  onMouseLeave={(e) => {
                    if (!exportLoading) (e.currentTarget as HTMLButtonElement).style.background = "var(--t-panel)"
                  }}
                >
                  {exportLoading ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.9s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  )}
                  {exportLoading ? "Generating…" : "Week Report"}
                </button>
              </div>
            )}
          </div>

          <div className="schedule-right">
            {habits.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--t-muted)", marginTop: 60, fontSize: "1rem" }}>
                <p>No habits yet.</p>
                <button
                  onClick={async () => {
                    const { data } = await supabase
                      .from("habits")
                      .insert({ user_id: user.id, title: "", group_end: false, sort_order: 0 })
                      .select()
                      .single()
                    if (data) setHabits([data as Habit])
                  }}
                  style={{
                    marginTop: 12,
                    padding: "10px 24px",
                    borderRadius: 10,
                    border: "none",
                    background: "var(--t-primary)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Add your first habit
                </button>
              </div>
            ) : (
              <HabitList
                habits={habits}
                entries={habitEntries}
                userId={user.id}
                today={today}
                dateLabel={DAYS[dayIndex]}
                headerLabel="Habits"
                showDateLabel={false}
                onHabitsChange={setHabits}
                onEntriesChange={setHabitEntries}
              />
            )}
          </div>
        </div>
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
          calHours={calHours}
          calStartHours={calStartHours}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  )
}
