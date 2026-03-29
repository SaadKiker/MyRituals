import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user || user.email !== "saadkiker.k@gmail.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })

  const [
    { data: goalSets },
    { data: goals },
    { data: habits },
    { data: scheduleEvents },
    { data: taskLists },
    { data: tasks },
    { data: reminders },
  ] = await Promise.all([
    admin.from("goal_sets").select("*"),
    admin.from("goals").select("*"),
    admin.from("habits").select("*"),
    admin.from("schedule_events").select("*"),
    admin.from("task_lists").select("*"),
    admin.from("tasks").select("*"),
    admin.from("reminders").select("*"),
  ])

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    })),
    goalSets: goalSets ?? [],
    goals: goals ?? [],
    habits: habits ?? [],
    scheduleEvents: scheduleEvents ?? [],
    taskLists: taskLists ?? [],
    tasks: tasks ?? [],
    reminders: reminders ?? [],
  })
}
