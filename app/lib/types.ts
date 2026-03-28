export type TaskList = {
  id: string
  user_id: string
  title: string
  sort_order: number
  card_color?: string | null
  created_at?: string
  updated_at?: string
}

export type Task = {
  id: string
  task_list_id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export type Reminder = {
  id: string
  user_id: string
  title: string
  remind_at: string // ISO date string
  created_at?: string
}
