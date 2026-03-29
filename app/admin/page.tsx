"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

type UserRow = { id: string; email: string; created_at: string; last_sign_in_at: string }
type GoalSet = { id: string; user_id: string; title: string; target_date: string | null }
type Goal = { id: string; user_id: string; goal_set_id: string; title: string; current_value: number; target_value: number }
type Habit = { id: string; user_id: string; title: string }
type ScheduleEvent = { id: string; user_id: string; title: string; start_hour: number; start_minute: number; end_hour: number; end_minute: number; color: string }
type TaskList = { id: string; user_id: string; title: string }
type Task = { id: string; user_id: string; task_list_id: string; title: string; completed: boolean }
type Reminder = { id: string; user_id: string; title: string; remind_at: string }

type Data = {
  users: UserRow[]
  goalSets: GoalSet[]
  goals: Goal[]
  habits: Habit[]
  scheduleEvents: ScheduleEvent[]
  taskLists: TaskList[]
  tasks: Task[]
  reminders: Reminder[]
}

export default function AdminPage() {
  const [status, setStatus] = useState<"loading" | "forbidden" | "ok">("loading")
  const [data, setData] = useState<Data | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || session.user.email !== "saadkiker.k@gmail.com") {
        setStatus("forbidden")
        return
      }
      const res = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) { setStatus("forbidden"); return }
      setData(await res.json())
      setStatus("ok")
    })
  }, [])

  if (status === "loading") return <p style={s.center}>Loading…</p>
  if (status === "forbidden") return <p style={s.center}>Access denied.</p>
  if (!data) return null

  return (
    <div style={s.wrap}>
      <h1 style={s.h1}>Admin — {data.users.length} users</h1>
      {data.users.map((u) => {
        const open = expanded === u.id
        const userGoalSets = data.goalSets.filter((gs) => gs.user_id === u.id)
        const userHabits = data.habits.filter((h) => h.user_id === u.id)
        const userEvents = data.scheduleEvents.filter((e) => e.user_id === u.id)
        const userTaskLists = data.taskLists.filter((tl) => tl.user_id === u.id)
        const userTasks = data.tasks.filter((t) => t.user_id === u.id)
        const userReminders = data.reminders.filter((r) => r.user_id === u.id)

        return (
          <div key={u.id} style={s.card}>
            <div style={s.cardHeader} onClick={() => setExpanded(open ? null : u.id)}>
              <strong>{u.email}</strong>
              <span style={s.meta}>
                joined {new Date(u.created_at).toLocaleDateString()} ·{" "}
                last seen {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "never"} ·{" "}
                {userGoalSets.length} goal sets · {userHabits.length} habits · {userEvents.length} events · {userTaskLists.length} task lists · {userTasks.length} tasks · {userReminders.length} reminders
              </span>
              <span>{open ? "▲" : "▼"}</span>
            </div>

            {open && (
              <div style={s.cardBody}>
                <Section title="Goals">
                  {userGoalSets.length === 0 ? <Empty /> : userGoalSets.map((gs) => (
                    <div key={gs.id} style={s.group}>
                      <div style={s.groupTitle}>{gs.title || "(untitled)"}{gs.target_date ? ` — by ${gs.target_date}` : ""}</div>
                      {data.goals.filter((g) => g.goal_set_id === gs.id).map((g) => (
                        <div key={g.id} style={s.row}>
                          {g.title || "(untitled)"} — {g.current_value}/{g.target_value}
                        </div>
                      ))}
                    </div>
                  ))}
                </Section>

                <Section title="Habits">
                  {userHabits.length === 0 ? <Empty /> : userHabits.map((h) => (
                    <div key={h.id} style={s.row}>{h.title || "(untitled)"}</div>
                  ))}
                </Section>

                <Section title="Schedule">
                  {userEvents.length === 0 ? <Empty /> : userEvents.map((e) => (
                    <div key={e.id} style={s.row}>
                      {String(e.start_hour).padStart(2, "0")}:{String(e.start_minute ?? 0).padStart(2, "0")} – {String(e.end_hour).padStart(2, "0")}:{String(e.end_minute ?? 0).padStart(2, "0")} · {e.title || "(untitled)"}
                    </div>
                  ))}
                </Section>

                <Section title="Tasks">
                  {userTaskLists.length === 0 ? <Empty /> : userTaskLists.map((tl) => (
                    <div key={tl.id} style={s.group}>
                      <div style={s.groupTitle}>{tl.title || "(untitled)"}</div>
                      {data.tasks.filter((t) => t.task_list_id === tl.id).map((t) => (
                        <div key={t.id} style={s.row}>
                          {t.completed ? "✓" : "○"} {t.title || "(untitled)"}
                        </div>
                      ))}
                    </div>
                  ))}
                </Section>

                <Section title="Reminders">
                  {userReminders.length === 0 ? <Empty /> : userReminders.map((r) => (
                    <div key={r.id} style={s.row}>
                      {new Date(r.remind_at).toLocaleString()} · {r.title || "(untitled)"}
                    </div>
                  ))}
                </Section>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={s.sectionTitle}>{title}</div>
      {children}
    </div>
  )
}

function Empty() {
  return <div style={s.empty}>None</div>
}

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 800, margin: "40px auto", padding: "0 20px", fontFamily: "monospace", fontSize: 14 },
  h1: { fontSize: 20, marginBottom: 20 },
  center: { textAlign: "center", marginTop: 100, fontFamily: "monospace" },
  card: { border: "1px solid #ccc", borderRadius: 6, marginBottom: 12, overflow: "hidden" },
  cardHeader: { padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#f5f5f5" },
  meta: { color: "#666", fontSize: 12, flex: 1, marginLeft: 12 },
  cardBody: { padding: "16px", borderTop: "1px solid #ccc" },
  sectionTitle: { fontWeight: "bold", marginBottom: 6, textTransform: "uppercase", fontSize: 11, color: "#555" },
  group: { marginBottom: 10 },
  groupTitle: { fontWeight: "bold", marginBottom: 4 },
  row: { padding: "3px 0", paddingLeft: 12 },
  empty: { color: "#999", paddingLeft: 12 },
}
