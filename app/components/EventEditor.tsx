"use client"

import { useState, useEffect } from "react"
import {
  COLORS,
  CAL_ALL_HOURS,
  CAL_START_HOURS,
  resolveColor,
  type ScheduleEventType,
  type EventEntry,
} from "./ScheduleEvent"

type Props = {
  event: ScheduleEventType | null
  defaultHour: number
  entry: EventEntry | undefined
  userId: string
  onSave: (data: Omit<ScheduleEventType, "id" | "user_id">, id?: string) => void
  onDelete: (id: string) => void
  onSetStatus: (eventId: string, status: "completed" | "skipped" | null) => void
  onClose: () => void
}

export default function EventEditor({ event, defaultHour, entry, userId, onSave, onDelete, onSetStatus, onClose }: Props) {
  const isNew = !event

  const [title, setTitle] = useState(event?.title ?? "")
  const [startH, setStartH] = useState(event?.start_hour ?? defaultHour)
  const [startM, setStartM] = useState(event?.start_minute ?? 0)
  const [endH, setEndH] = useState(() => {
    if (event) return event.end_hour
    const si = CAL_ALL_HOURS.indexOf(defaultHour)
    return CAL_ALL_HOURS[Math.min(si + 1, CAL_ALL_HOURS.length - 1)]
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
      const si = CAL_ALL_HOURS.indexOf(defaultHour)
      setEndH(CAL_ALL_HOURS[Math.min(si + 1, CAL_ALL_HOURS.length - 1)])
      setEndM(0)
    }
    setColor(resolveColor(event?.color ?? COLORS[0]))
    setError("")
  }, [event, defaultHour])

  function handleSave() {
    const si = CAL_ALL_HOURS.indexOf(startH)
    const ei = CAL_ALL_HOURS.indexOf(endH)
    if (si === -1 || ei === -1 || ei <= si) {
      setError("End time must be after start time.")
      return
    }
    onSave({ title: title.trim() || "Untitled", start_hour: startH, start_minute: startM, end_hour: endH, end_minute: endM, color }, event?.id)
  }

  const status = entry?.status ?? null

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(47,102,144,0.06)",
    border: "1.5px solid #c8dfe9",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#2f6690",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  }

  const selectStyle: React.CSSProperties = {
    flex: 1,
    background: "rgba(47,102,144,0.06)",
    border: "1.5px solid #c8dfe9",
    borderRadius: 8,
    padding: "7px 6px",
    color: "#2f6690",
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
          background: "#f4f9fc",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 48px rgba(47,102,144,0.25)",
          border: "1.5px solid #c8dfe9",
          zIndex: 100,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: "#2f6690", marginBottom: 18 }}>
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
            <label style={{ display: "block", fontSize: 11, color: "#5a7a99", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Start</label>
            <div style={{ display: "flex", gap: 4 }}>
              <select value={startH} onChange={(e) => setStartH(parseInt(e.target.value))} style={selectStyle}>
                {CAL_START_HOURS.map((h) => (
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
            <label style={{ display: "block", fontSize: 11, color: "#5a7a99", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>End</label>
            <div style={{ display: "flex", gap: 4 }}>
              <select value={endH} onChange={(e) => setEndH(parseInt(e.target.value))} style={selectStyle}>
                {CAL_ALL_HOURS.map((h) => (
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
                  border: color === c ? "2.5px solid #2f6690" : "2px solid transparent",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.15s, border 0.15s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Status (edit mode only) */}
        {!isNew && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, color: "#5a7a99", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Today's Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["completed", "skipped", null] as const).map((s) => {
                const active = status === s
                let bg = "rgba(47,102,144,0.06)"
                let borderColor = "#c8dfe9"
                let textColor = "#5a7a99"
                let label = s === null ? "Clear" : s.charAt(0).toUpperCase() + s.slice(1)
                if (s === "completed") {
                  bg = active ? "#22c55e" : "rgba(34,197,94,0.12)"
                  borderColor = active ? "#22c55e" : "rgba(34,197,94,0.4)"
                  textColor = active ? "#fff" : "#166534"
                } else if (s === "skipped") {
                  bg = active ? "#ff453a" : "rgba(255,69,58,0.08)"
                  borderColor = active ? "#ff453a" : "rgba(255,69,58,0.3)"
                  textColor = active ? "#fff" : "#c0392b"
                }
                return (
                  <button
                    key={String(s)}
                    onClick={() => event && onSetStatus(event.id, s)}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      borderRadius: 8,
                      border: `2px solid ${borderColor}`,
                      background: bg,
                      color: textColor,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && <div style={{ color: "#c0392b", fontSize: 12, marginBottom: 10 }}>{error}</div>}

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          {!isNew && (
            <button
              onClick={() => event && onDelete(event.id)}
              style={{
                marginRight: "auto",
                background: "rgba(255,69,58,0.08)",
                color: "#c0392b",
                border: "1px solid rgba(255,69,58,0.3)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#5a7a99",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              background: "#2f6690",
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
