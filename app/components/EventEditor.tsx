"use client"

import { useState, useEffect } from "react"
import {
  COLORS,
  CAL_ALL_HOURS,
  CAL_START_HOURS,
  resolveColor,
  type ScheduleEventType,
} from "./ScheduleEvent"

type Props = {
  event: ScheduleEventType | null
  defaultHour: number
  calHours?: number[]
  calStartHours?: number[]
  onSave: (data: Omit<ScheduleEventType, "id" | "user_id">, id?: string) => void
  onClose: () => void
}

export default function EventEditor({ event, defaultHour, calHours, calStartHours, onSave, onClose }: Props) {
  const isNew = !event
  const hours = calHours ?? CAL_ALL_HOURS
  const startHours = calStartHours ?? CAL_START_HOURS

  const [title, setTitle] = useState(event?.title ?? "")
  const [startH, setStartH] = useState(event?.start_hour ?? defaultHour)
  const [startM, setStartM] = useState(event?.start_minute ?? 0)
  const [endH, setEndH] = useState(() => {
    if (event) return event.end_hour
    const si = hours.indexOf(defaultHour)
    return hours[Math.min(si + 1, hours.length - 1)]
  })
  const [endM, setEndM] = useState(event?.end_minute ?? 0)
  const [color, setColor] = useState(resolveColor(event?.color ?? COLORS[0]))
  const [error, setError] = useState("")

  useEffect(() => {
    setTitle(event?.title ?? "")
    setStartH(event?.start_hour ?? defaultHour)
    setStartM(event?.start_minute ?? 0)
    if (event) {
      setEndH(event.end_hour)
      setEndM(event.end_minute)
    } else {
      const si = hours.indexOf(defaultHour)
      setEndH(hours[Math.min(si + 1, hours.length - 1)])
      setEndM(0)
    }
    setColor(resolveColor(event?.color ?? COLORS[0]))
    setError("")
  }, [event, defaultHour])

  function handleSave() {
    const si = hours.indexOf(startH)
    const ei = hours.indexOf(endH)
    const startTotalMins = startH * 60 + startM
    const endTotalMins = endH * 60 + endM
    if (si === -1 || ei === -1 || endTotalMins <= startTotalMins) {
      setError("End time must be after start time.")
      return
    }
    onSave({ title: title.trim() || "Untitled", start_hour: startH, start_minute: startM, end_hour: endH, end_minute: endM, color }, event?.id)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--t-p06)",
    border: "1.5px solid var(--t-input-border)",
    borderRadius: 8,
    padding: "8px 10px",
    color: "var(--t-primary)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  }

  const selectStyle: React.CSSProperties = {
    flex: 1,
    background: "var(--t-p06)",
    border: "1.5px solid var(--t-input-border)",
    borderRadius: 8,
    padding: "7px 6px",
    color: "var(--t-primary)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 99,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(320px, calc(100vw - 32px))",
          background: "var(--t-panel)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 48px var(--t-p25)",
          border: "1.5px solid var(--t-input-border)",
          zIndex: 100,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: "var(--t-primary)", marginBottom: 18 }}>
          {isNew ? "New Event" : "Edit Event"}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: "#5a7a99", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Title</label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event name"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Time row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--t-muted)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Start</label>
            <div style={{ display: "flex", gap: 4 }}>
              <select value={startH} onChange={(e) => setStartH(parseInt(e.target.value))} style={selectStyle}>
                {startHours.map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                ))}
              </select>
              <select value={startM} onChange={(e) => setStartM(parseInt(e.target.value))} style={selectStyle}>
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--t-muted)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>End</label>
            <div style={{ display: "flex", gap: 4 }}>
              <select value={endH} onChange={(e) => setEndH(parseInt(e.target.value))} style={selectStyle}>
                {hours.map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                ))}
              </select>
              <select value={endM} onChange={(e) => setEndM(parseInt(e.target.value))} style={selectStyle}>
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Color */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, color: "#5a7a99", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLORS.map((c) => (
              <div
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: c,
                  cursor: "pointer",
                  border: color === c ? "2.5px solid var(--t-primary)" : "2px solid transparent",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.15s, border 0.15s",
                }}
              />
            ))}
          </div>
        </div>

        {error && <div style={{ color: "#c0392b", fontSize: 12, marginBottom: 10 }}>{error}</div>}

        {/* Actions — Cancel & Save right-aligned (New + Edit) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--t-muted)",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              background: "var(--t-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}
