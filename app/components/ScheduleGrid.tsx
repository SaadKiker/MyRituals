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
  calHours?: number[]
  calStartHours?: number[]
  onGridClick: (hour: number) => void
  onEventEdit: (event: ScheduleEventType) => void
  onEventContextMenu: (event: ScheduleEventType, x: number, y: number) => void
}

export default function ScheduleGrid({
  events,
  entries,
  allComplete,
  calHours,
  calStartHours,
  onGridClick,
  onEventEdit,
  onEventContextMenu,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const hours = calHours ?? CAL_ALL_HOURS
  const startHours = calStartHours ?? CAL_START_HOURS

  function handleBodyClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest(".event-block-react")) return
    const rect = (bodyRef.current as HTMLDivElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const idx = Math.floor(y / HOUR_H)
    if (idx < 0 || idx >= startHours.length) return
    onGridClick(startHours[idx])
  }

  const totalH = startHours.length * HOUR_H

  return (
    <div
      style={{
        display: "flex",
        height: totalH,
        background: "#fff",
        borderRadius: 12,
        border: "1.5px solid var(--t-border)",
        overflow: "hidden",
        boxShadow: "0 4px 16px var(--t-p08)",
      }}
    >
      {/* Time Axis */}
      <div
        style={{
          width: 64,
          flexShrink: 0,
          borderRight: "1.5px solid var(--t-border)",
          background: "var(--t-p02)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {startHours.map((h) => (
          <div
            key={h}
            style={{
              height: HOUR_H,
              fontSize: 11,
              color: "var(--t-time)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              fontWeight: 600,
              paddingTop: 6,
              borderBottom: "1px solid var(--t-p05)",
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
            {startHours.map((h, i) => (
              <div
                key={h}
                style={{
                  height: HOUR_H,
                  borderTop: i === 0 ? "none" : "1px solid var(--t-p06)",
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
                  calHours={hours}
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
