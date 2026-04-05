"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

type Rule = {
  id: string
  user_id: string
  title: string
  category: string
  sort_order: number
}

export default function RulesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryDraft, setNewCategoryDraft] = useState("")
  const [addingRuleInCategory, setAddingRuleInCategory] = useState<string | null>(null)
  const [newRuleDraft, setNewRuleDraft] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const newRuleInputRef = useRef<HTMLInputElement>(null)
  const newCatInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return }
      setUser(session.user)
      supabase
        .from("rules")
        .select("*")
        .eq("user_id", session.user.id)
        .order("sort_order", { ascending: true })
        .then(({ data }) => {
          setRules((data as Rule[]) ?? [])
          setLoading(false)
        })
    })
  }, [router])

  useEffect(() => {
    if (addingRuleInCategory) setTimeout(() => newRuleInputRef.current?.focus(), 50)
  }, [addingRuleInCategory])

  useEffect(() => {
    if (addingCategory) setTimeout(() => newCatInputRef.current?.focus(), 50)
  }, [addingCategory])

  const categoryOrder: string[] = []
  const grouped: Record<string, Rule[]> = {}
  for (const r of rules) {
    if (!grouped[r.category]) { grouped[r.category] = []; categoryOrder.push(r.category) }
    grouped[r.category].push(r)
  }

  async function addRule(category: string) {
    if (!user) return
    const title = newRuleDraft.trim()
    if (!title) { setAddingRuleInCategory(null); return }
    const sortOrder = rules.filter((r) => r.category === category).length
    const { data } = await supabase
      .from("rules")
      .insert({ user_id: user.id, title, category, sort_order: sortOrder })
      .select()
      .single()
    if (data) setRules((prev) => [...prev, data as Rule])
    setNewRuleDraft("")
    setAddingRuleInCategory(null)
  }

  async function addCategory() {
    const cat = newCategoryDraft.trim()
    if (!cat) { setAddingCategory(false); return }
    setAddingCategory(false)
    setNewCategoryDraft("")
    setNewRuleDraft("")
    setAddingRuleInCategory(cat)
  }

  async function saveEdit(id: string) {
    const title = draft.trim()
    if (!title) { setEditingId(null); return }
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, title } : r)))
    setEditingId(null)
    await supabase.from("rules").update({ title }).eq("id", id)
  }

  async function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id))
    setDeleteId(null)
    await supabase.from("rules").delete().eq("id", id)
  }

  if (loading) return null

  const allCategories = [
    ...categoryOrder,
    ...(addingRuleInCategory && !categoryOrder.includes(addingRuleInCategory) ? [addingRuleInCategory] : []),
  ]

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0d0d0d; }

        .rule-card {
          background: #1a0f0f;
          border: 1.5px solid rgba(192,57,43,0.2);
          border-radius: 20px;
          padding: 48px 32px;
          position: relative;
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .rule-card:hover {
          border-color: rgba(192,57,43,0.6);
          transform: translateY(-4px);
          box-shadow: 0 20px 48px rgba(192,57,43,0.18);
        }
        .rule-card:hover .rule-del {
          opacity: 1 !important;
        }
        .rule-text {
          font-size: clamp(1.6rem, 2.2vw, 2.2rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.25;
          letter-spacing: -0.02em;
          text-align: center;
          width: 100%;
        }
        .rule-text-input {
          font-size: clamp(1.6rem, 2.2vw, 2.2rem);
          font-weight: 800;
          color: rgba(255,255,255,0.3);
          line-height: 1.25;
          letter-spacing: -0.02em;
          text-align: center;
          background: transparent;
          border: none;
          outline: none;
          font-family: inherit;
          width: 100%;
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "var(--font-rubik), system-ui, sans-serif" }}>

        {/* Top bar */}
        <div style={{ padding: "28px 60px", display: "flex", justifyContent: "flex-end", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <button
            onClick={() => setAddingCategory(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 22px", borderRadius: 8,
              border: "1.5px solid rgba(192,57,43,0.35)",
              background: "transparent", color: "#c0392b",
              fontWeight: 700, fontSize: "0.75rem",
              letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Category
          </button>
        </div>

        {/* New category overlay */}
        {addingCategory && (
          <div
            onClick={() => { setAddingCategory(false); setNewCategoryDraft("") }}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(680px, 90vw)", padding: "0 40px" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 24, opacity: 0.55 }}>
                New Category
              </div>
              <input
                ref={newCatInputRef}
                value={newCategoryDraft}
                onChange={(e) => setNewCategoryDraft(e.target.value)}
                placeholder="Religion, Health, Money…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addCategory()
                  if (e.key === "Escape") { setAddingCategory(false); setNewCategoryDraft("") }
                }}
                style={{
                  width: "100%", background: "transparent", border: "none",
                  borderBottom: "2px solid #c0392b", padding: "16px 0",
                  color: "#fff", fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                  fontWeight: 900, fontFamily: "inherit", outline: "none",
                  letterSpacing: "-0.03em",
                }}
              />
              <div style={{ marginTop: 20, fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", fontWeight: 500, letterSpacing: "0.04em" }}>
                Enter to confirm · Esc to cancel
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {allCategories.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 900, color: "rgba(255,255,255,0.04)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                No rules.<br />No code.
              </div>
              <div style={{ marginTop: 40, fontSize: "0.7rem", color: "#c0392b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.45 }}>
                Create a category →
              </div>
            </div>
          </div>
        )}

        {/* Categories */}
        {allCategories.map((cat) => (
          <div key={cat} style={{ marginBottom: 80 }}>

            {/* Category header */}
            <div style={{ padding: "60px 60px 24px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
              <h2 style={{
                fontSize: "clamp(3rem, 6vw, 5rem)",
                fontWeight: 900,
                color: "#c0392b",
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                textTransform: "uppercase",
              }}>
                {cat}
              </h2>
              <button
                onClick={() => { setAddingRuleInCategory(cat); setNewRuleDraft("") }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", borderRadius: 7,
                  border: "1px solid rgba(192,57,43,0.35)",
                  background: "transparent", color: "#c0392b",
                  fontWeight: 700, fontSize: "0.7rem",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "inherit",
                  flexShrink: 0, marginBottom: 8,
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Rule
              </button>
            </div>

            {/* Rules grid — 4 columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, padding: "0 48px" }}>
              {(grouped[cat] ?? []).map((rule) => (
                <div key={rule.id} className="rule-card">

                  {editingId === rule.id ? (
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEdit(rule.id)
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      onBlur={() => void saveEdit(rule.id)}
                      className="rule-text-input"
                    />
                  ) : (
                    <span
                      className="rule-text"
                      onDoubleClick={() => { setEditingId(rule.id); setDraft(rule.title) }}
                    >
                      {rule.title}
                    </span>
                  )}

                  <button
                    className="rule-del"
                    onClick={() => setDeleteId(rule.id)}
                    style={{
                      position: "absolute", top: 16, right: 20,
                      background: "transparent", border: "none",
                      color: "#c0392b", opacity: 0,
                      fontSize: "1.5rem", lineHeight: 1,
                      cursor: "pointer", transition: "opacity 0.15s",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Inline add card */}
              {addingRuleInCategory === cat && (
                <div className="rule-card" style={{ background: "#130e0e", border: "1.5px dashed rgba(192,57,43,0.3)" }}>
                  <input
                    ref={newRuleInputRef}
                    value={newRuleDraft}
                    onChange={(e) => setNewRuleDraft(e.target.value)}
                    placeholder="Write your rule…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addRule(cat)
                      if (e.key === "Escape") { setAddingRuleInCategory(null); setNewRuleDraft("") }
                    }}
                    onBlur={() => void addRule(cat)}
                    className="rule-text-input"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div
          onClick={() => setDeleteId(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#161010", borderRadius: 12, border: "1px solid rgba(192,57,43,0.25)", padding: "40px 48px", maxWidth: 340, width: "100%", textAlign: "center" }}
          >
            <p style={{ color: "#fff", fontWeight: 800, fontSize: "1.2rem", marginBottom: 32, letterSpacing: "-0.01em" }}>Delete this rule?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "11px 24px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => void deleteRule(deleteId)} style={{ padding: "11px 24px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
