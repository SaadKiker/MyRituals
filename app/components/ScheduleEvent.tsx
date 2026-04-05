"use client"

import { useRef } from "react"

export type ScheduleEventType = {
  id: string
  user_id: string
  title: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  color: string
  day_of_week: number
}

export type EventEntry = {
  id?: string
  event_id: string
  user_id: string
  entry_date: string
  status: "completed" | "skipped" | null
}

export const CAL_ALL_HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]
export const CAL_START_HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5]
export const HOUR_H = 40
export const COLORS = [
  "#E07B6A",
  "#F0A500",
  "#E8C84A",
  "#7FAF7A",
  "#7A9BBF",
  "#A07898",
  "#A0724A",
  "#E8909A",
]

/** Legacy hex / CSS vars from the previous palette → same slot in new palette */
const LEGACY_COLOR_MAP: Record<string, string> = {
  "var(--cal-col-1)": COLORS[0],
  "var(--cal-col-2)": COLORS[1],
  "var(--cal-col-3)": COLORS[2],
  "var(--cal-col-4)": COLORS[3],
  "var(--cal-col-5)": COLORS[4],
  "var(--cal-col-6)": COLORS[5],
  "var(--cal-col-7)": COLORS[6],
  "var(--cal-col-8)": COLORS[7],
  "#e07060": COLORS[0],
  "#4a9070": COLORS[1],
  "#c4880a": COLORS[2],
  "#8060a0": COLORS[3],
  "#d4724a": COLORS[4],
  "#5070a0": COLORS[5],
  "#b04848": COLORS[6],
  "#7a7e5a": COLORS[7],
}

export function resolveColor(color: string): string {
  const key = color.trim()
  if (LEGACY_COLOR_MAP[key] !== undefined) return LEGACY_COLOR_MAP[key]
  const lower = key.toLowerCase()
  if (LEGACY_COLOR_MAP[lower] !== undefined) return LEGACY_COLOR_MAP[lower]
  return color
}

/**
 * Space cards store the same hex as calendar events; on screen we blend with the panel
 * so the card reads lighter than a solid event block, but not washed out.
 */
export function spaceCardBackground(storedEventColor: string | null | undefined): string {
  if (!storedEventColor) return "var(--t-panel)"
  const base = resolveColor(storedEventColor)
  return `color-mix(in srgb, ${base} 40%, var(--t-panel))`
}

function pad(n: number) {
  return String(n ?? 0).padStart(2, "0")
}

type Props = {
  event: ScheduleEventType
  entry: EventEntry | undefined
  allComplete: boolean
  calHours?: number[]
  onEdit: (event: ScheduleEventType) => void
  onContextMenu: (event: ScheduleEventType, x: number, y: number) => void
}

export default function ScheduleEvent({ event, entry, allComplete, calHours, onEdit, onContextMenu }: Props) {
  const hours = calHours ?? CAL_ALL_HOURS
  let startIdx = hours.indexOf(event.start_hour)
  let endIdx = hours.indexOf(event.end_hour)
  if (startIdx === -1) return null
  if (endIdx === -1) endIdx = startIdx // fallback

  let diffHours = endIdx - startIdx
  if (diffHours < 0) diffHours += hours.length // handle midnight wrap-around based on array length

  let diffMinutes = diffHours * 60 + event.end_minute - event.start_minute
  if (diffMinutes <= 0) diffMinutes = 30 // safeguard

  const top = startIdx * HOUR_H + (event.start_minute / 60) * HOUR_H
  const durHours = diffMinutes / 60
  const isShort = diffMinutes <= 35 // Anything ~30 mins or less

  const status = entry?.status ?? null
  const color = resolveColor(event.color)

  let bg = color
  let borderLeft = `4px solid rgba(0,0,0,0.2)`
  let boxShadow = "0 2px 6px rgba(0,0,0,0.15)"
  if (status === "completed") {
    bg = allComplete ? "rgba(234,179,8,0.9)" : "rgba(34,197,94,0.85)"
    borderLeft = allComplete ? "4px solid #eab308" : "4px solid #22c55e"
    boxShadow = allComplete ? "0 6px 20px rgba(234,179,8,0.45)" : "0 4px 14px rgba(34,197,94,0.4)"
  } else if (status === "skipped") {
    bg = "rgba(255,69,58,0.65)"
    borderLeft = "3px solid rgba(255,69,58,0.9)"
  }

  // Long-press for mobile context menu
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  function handleTouchStart(e: React.TouchEvent) {
    longPressFired.current = false
    const touch = e.touches[0]
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      onContextMenu(event, touch.clientX, touch.clientY)
    }, 500)
  }

  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  function handleClick() {
    if (longPressFired.current) { longPressFired.current = false; return }
    onEdit(event)
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu(event, e.clientX, e.clientY)
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      style={{
        position: "absolute",
        left: 8,
        right: 8,
        top: top,
        height: durHours * HOUR_H - 2, // 2px margin top/bottom effectively
        background: bg,
        borderRadius: 8,
        padding: isShort ? "2px 8px" : "6px 10px",
        fontSize: isShort ? 12 : 13,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow,
        borderLeft,
        color: "#fff",
        zIndex: 5,
        lineHeight: 1.4,
        display: "flex",
        flexDirection: "row",
        alignItems: isShort ? "center" : "flex-start",
        justifyContent: "space-between",
        gap: 8,
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: isShort ? 11 : 13,
          flex: 1,
          overflow: "hidden",
          lineHeight: isShort ? 1.1 : 1.3,
          whiteSpace: isShort ? "nowrap" : "pre-line",
          textOverflow: isShort ? "ellipsis" : "clip",
        }}
      >
        {event.title || "Untitled"}
      </div>
      <div style={{ opacity: 0.85, fontSize: isShort ? 10 : 11, whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" }}>
        {pad(event.start_hour)}:{pad(event.start_minute)} – {pad(event.end_hour)}:{pad(event.end_minute)}
      </div>
    </div>
  )
}
