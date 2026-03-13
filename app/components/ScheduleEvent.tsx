"use client"

export type ScheduleEventType = {
  id: string
  user_id: string
  title: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  color: string
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
  "#e07060",
  "#4a9070",
  "#c4880a",
  "#8060a0",
  "#d4724a",
  "#5070a0",
  "#b04848",
  "#7a7e5a",
]

export function resolveColor(color: string): string {
  const map: Record<string, string> = {
    "var(--cal-col-1)": "#e07060",
    "var(--cal-col-2)": "#4a9070",
    "var(--cal-col-3)": "#c4880a",
    "var(--cal-col-4)": "#8060a0",
    "var(--cal-col-5)": "#d4724a",
    "var(--cal-col-6)": "#5070a0",
    "var(--cal-col-7)": "#b04848",
    "var(--cal-col-8)": "#7a7e5a",
  }
  return map[color] ?? color
}

function pad(n: number) {
  return String(n ?? 0).padStart(2, "0")
}

type Props = {
  event: ScheduleEventType
  entry: EventEntry | undefined
  allComplete: boolean
  onEdit: (event: ScheduleEventType) => void
  onContextMenu: (event: ScheduleEventType, x: number, y: number) => void
}

export default function ScheduleEvent({ event, entry, allComplete, onEdit, onContextMenu }: Props) {
  let startIdx = CAL_ALL_HOURS.indexOf(event.start_hour)
  let endIdx = CAL_ALL_HOURS.indexOf(event.end_hour)
  if (startIdx === -1) startIdx = 0
  if (endIdx === -1 || endIdx <= startIdx) endIdx = Math.min(startIdx + 1, CAL_ALL_HOURS.length - 1)
  const durSlots = Math.max(1, endIdx - startIdx)

  const status = entry?.status ?? null
  const color = resolveColor(event.color)

  let bg = color
  let borderLeft = `4px solid rgba(0,0,0,0.2)`
  let boxShadow = "0 2px 6px rgba(0,0,0,0.15)"
  if (status === "completed") {
    bg = allComplete ? "rgba(255,215,0,0.85)" : "rgba(48,209,88,0.7)"
    borderLeft = allComplete ? "4px solid rgba(255,215,0,1)" : "3px solid rgba(48,209,88,0.9)"
    boxShadow = allComplete ? "0 4px 12px rgba(255,215,0,0.4)" : "0 2px 6px rgba(48,209,88,0.3)"
  } else if (status === "skipped") {
    bg = "rgba(255,69,58,0.65)"
    borderLeft = "3px solid rgba(255,69,58,0.9)"
  }

  return (
    <div
      onClick={() => onEdit(event)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu(event, e.clientX, e.clientY)
      }}
      style={{
        position: "absolute",
        left: 8,
        right: 8,
        top: startIdx * HOUR_H,
        height: durSlots * HOUR_H - 4,
        background: bg,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 13,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow,
        borderLeft,
        color: "#fff",
        zIndex: 5,
        lineHeight: 1.4,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
        minHeight: 36,
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          flex: 1,
          overflow: "hidden",
          lineHeight: 1.3,
          whiteSpace: "pre-line",
        }}
      >
        {event.title || "Untitled"}
      </div>
      <div style={{ opacity: 0.85, fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" }}>
        {pad(event.start_hour)}:{pad(event.start_minute)} – {pad(event.end_hour)}:{pad(event.end_minute)}
      </div>
    </div>
  )
}
