"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { useAppUser } from "../../layout"
import SpaceGoalsList from "../../../components/SpaceGoalsList"
import type { Goal } from "../../../components/GoalItem"

type GoalSetRecord = {
  id: string
  user_id: string
  title: string
  target_date: string | null
  sort_order: number
}

function getSpaceLabel(title: string) {
  return title.trim() ? title : "Untitled Space"
}

function getDaysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null
  const parts = dateStr.split("T")[0].split("-").map(Number)
  const target = new Date(parts[0], parts[1] - 1, parts[2])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function SpacePage() {
  const params = useParams<{ spaceId: string }>()
  const router = useRouter()
  const user = useAppUser()
  const [space, setSpace] = useState<GoalSetRecord | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isEntering, setIsEntering] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setIsEntering(false), 280)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!params.spaceId) return
    ;(async () => {
      const { data: foundSpace } = await supabase
        .from("goal_sets")
        .select("*")
        .eq("id", params.spaceId)
        .eq("user_id", user.id)
        .single()

      if (!foundSpace) {
        router.replace("/goals")
        return
      }

      const { data: foundGoals } = await supabase
        .from("goals")
        .select("*")
        .eq("goal_set_id", params.spaceId)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })

      setSpace(foundSpace as GoalSetRecord)
      setGoals((foundGoals ?? []) as Goal[])
      setLoading(false)
    })()
  }, [params.spaceId, router, user.id])

  const breadcrumbLabel = useMemo(() => (space ? getSpaceLabel(space.title) : ""), [space])

  function handleBack() {
    setIsLeaving(true)
    setTimeout(() => {
      router.push("/goals")
    }, 230)
  }

  if (loading || !space) return null

  return (
    <>
      <style>{`
        .space-page-shell {
          transition: transform 240ms ease, opacity 240ms ease;
        }
        .space-page-enter {
          transform: translateX(36px);
          opacity: 0;
        }
        .space-page-leave {
          transform: translateX(28px);
          opacity: 0;
        }
      `}</style>
      <div
        className={`space-page-shell ${isEntering ? "space-page-enter" : ""} ${isLeaving ? "space-page-leave" : ""}`}
        style={{
          maxWidth: 760,
          margin: "90px auto 0",
          padding: "0 20px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={handleBack}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                color: "var(--t-primary)",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Goals
            </button>
            <span style={{ color: "var(--t-muted)", fontWeight: 600 }}>{">"}</span>
            <span style={{ color: "var(--t-muted)", fontWeight: 600, fontSize: "0.95rem" }}>{breadcrumbLabel}</span>
          </div>
          {(() => {
            const daysLeft = getDaysLeft(space.target_date)
            if (daysLeft === null) return null
            const label = daysLeft === 1 ? "1 day left" : `${daysLeft} days left`
            return (
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--t-muted)",
                  background: "var(--t-p05)",
                  padding: "4px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--t-p10)"
                }}
              >
                {label}
              </span>
            )
          })()}
        </div>

        <SpaceGoalsList goalSetId={space.id} userId={user.id} initialGoals={goals} />
      </div>
    </>
  )
}
