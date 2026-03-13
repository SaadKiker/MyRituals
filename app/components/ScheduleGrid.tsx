"use client"

import { useRef } from "react"
import ScheduleEventComponent, {
  CAL_ALL_HOURS,
  CAL_START_HOURS,
  HOUR_H,
  type ScheduleEventType,
  type EventEntry,
} from "./ScheduleEvent"

type Props = {
  events: ScheduleEventType[]
  entries: EventEntry[]
  allComplete: boolean
  onGridClick: (hour: number) => void
  onEventEdit: (event: ScheduleEventType) => void
  onEventContextMenu: (event: ScheduleEventType, x: number, y: number) => void
}

export default function ScheduleGrid({
  events,
  entries,
  allComplete,
  onGridClick,
  onEventEdit,
  onEventContextMenu,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)

  function handleBodyClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest(".event-block-react")) return
    const rect = (bodyRef.current as HTMLDivElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const idx = Math.floor(y / HOUR_H)
    if (idx < 0 || idx >= CAL_START_HOURS.length) return
    onGridClick(CAL_START_HOURS[idx])
  }

  const totalH = CAL_ALL_HOURS.length * HOUR_H

  return (
    <div
      style={{
        display: "flex",
        height: totalH,
        background: "#fff",
        borderRadius: 12,
        border: "1.5px solid #d8eaf3",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(47,102,144,0.08)",
      }}
    >
      {/* Time Axis */}
      <div
        style={{
          width: 64,
          flexShrink: 0,
          borderRight: "1.5px solid #d8eaf3",
          background: "rgba(47,102,144,0.02)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {CAL_ALL_HOURS.map((h) => (
          <div
            key={h}
            style={{
              height: HOUR_H,
              fontSize: 11,
              color: "#7a9ab5",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              fontWeight: 600,
              paddingTop: 6,
              borderBottom: "1px solid rgba(47,102,144,0.05)",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", background: "#fff" }}>
        <div
          ref={bodyRef}
          onClick={handleBodyClick}
          style={{ position: "relative", width: "100%", height: "100%", cursor: "crosshair" }}
        >
          {/* Hour lines */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              zIndex: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {CAL_ALL_HOURS.map((h, i) => (
              <div
                key={h}
                style={{
                  height: HOUR_H,
                  borderTop: i === 0 ? "none" : "1px solid rgba(47,102,144,0.06)",
                  boxSizing: "border-box",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Event blocks */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
            {events.map((evt) => (
              <div key={evt.id} className="event-block-react">
                <ScheduleEventComponent
                  event={evt}
                  entry={entries.find((e) => e.event_id === evt.id)}
                  allComplete={allComplete}
                  onEdit={onEventEdit}
                  onContextMenu={onEventContextMenu}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
