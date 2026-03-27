"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/** Legacy list URLs redirect to `/tasks?list=` so bookmarks still work. */
export default function TaskListRedirectPage() {
  const params = useParams<{ listId: string }>()
  const router = useRouter()

  useEffect(() => {
    const id = params.listId
    if (id) router.replace(`/tasks?list=${encodeURIComponent(id)}`)
    else router.replace("/tasks")
  }, [params.listId, router])

  return null
}
