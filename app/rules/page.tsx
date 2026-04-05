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

const RED = "#c0392b"
const RED_LIGHT = "rgba(192, 57, 43, 0.08)"
const RED_BORDER = "rgba(192, 57, 43, 0.22)"
const RED_MID = "rgba(192, 57, 43, 0.35)"

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
        * { box-sizing: border-box; }
        body { margin: 0; background: #0f0a0a; }
        .rule-card {
          transition: transform 0.18s, box-shadow 0.18s;
          cursor: default;
        }
        .rule-card:hover {
          transform: scale(1.025);
          box-shadow: 0 12px 40px rgba(192,57,43,0.35) !important;
        }
        .rule-card:hover .rule-del {
          opacity: 1 !important;
        }
        .add-cat-btn:hover {
          background: rgba(192,57,43,0.15) !important;
        }
        .add-rule-btn:hover {
          background: rgba(192,57,43,0.12) !important;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#0f0a0a",
        padding: "48px 40px 80px",
        fontFamily: "var(--font-rubik), system-ui, sans-serif",
      }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 56 }}>
          <button
            className="add-cat-btn"
            onClick={() => setAddingCategory(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 22px", borderRadius: 10,
              border: `1.5px solid ${RED_BORDER}`,
              background: RED_LIGHT, color: RED,
              fontWeight: 700, fontSize: "0.85rem",
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Category
          </button>
        </div>

        {/* New category input */}
        {addingCategory && (
          <div style={{ display: "flex", gap: 10, marginBottom: 48 }}>
            <input
              ref={newCatInputRef}
              value={newCategoryDraft}
              onChange={(e) => setNewCategoryDraft(e.target.value)}
              placeholder="Category name…"
              onKeyDown={(e) => {
                if (e.key === "Enter") void addCategory()
                if (e.key === "Escape") { setAddingCategory(false); setNewCategoryDraft("") }
              }}
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)",
                border: `1.5px solid ${RED_BORDER}`, borderRadius: 10,
                padding: "12px 16px", color: "#fff",
                fontSize: "1.1rem", fontWeight: 600, fontFamily: "inherit", outline: "none",
              }}
            />
            <button onClick={addCategory} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: RED, color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>Create</button>
            <button onClick={() => { setAddingCategory(false); setNewCategoryDraft("") }} style={{ padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${RED_BORDER}`, background: "transparent", color: RED, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        )}

        {/* Empty state */}
        {allCategories.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 120, color: RED, opacity: 0.35 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 20 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div style={{ fontWeight: 800, fontSize: "1.4rem", marginBottom: 8 }}>No rules yet</div>
            <div style={{ fontSize: "1rem" }}>Create a category to begin</div>
          </div>
        )}

        {/* Categories */}
        {allCategories.map((cat) => (
          <div key={cat} style={{ marginBottom: 64 }}>
            {/* Category header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <span style={{
                fontSize: "0.7rem", fontWeight: 900, color: RED,
                textTransform: "uppercase", letterSpacing: "0.16em",
                opacity: 0.6,
              }}>
                {cat}
              </span>
              <div style={{ flex: 1, height: 1, background: RED_BORDER }} />
              <button
                className="add-rule-btn"
                onClick={() => { setAddingRuleInCategory(cat); setNewRuleDraft("") }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 7,
                  border: `1px solid ${RED_BORDER}`,
                  background: "transparent", color: RED,
                  fontWeight: 600, fontSize: "0.72rem",
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Rule
              </button>
            </div>

            {/* 4-column grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {(grouped[cat] ?? []).map((rule) => (
                <div
                  key={rule.id}
                  className="rule-card"
                  style={{
                    background: "rgba(192,57,43,0.08)",
                    border: `1.5px solid ${RED_BORDER}`,
                    borderRadius: 16,
                    padding: "28px 24px",
                    position: "relative",
                    boxShadow: "0 4px 16px rgba(192,57,43,0.1)",
                    minHeight: 130,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
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
                      style={{
                        flex: 1, background: "transparent", border: "none", outline: "none",
                        fontFamily: "inherit", fontSize: "1.15rem", fontWeight: 700, color: "#fff",
                        padding: 0, width: "100%", lineHeight: 1.4,
                      }}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => { setEditingId(rule.id); setDraft(rule.title) }}
                      style={{
                        flex: 1, fontSize: "1.15rem", fontWeight: 700,
                        color: "#fff", lineHeight: 1.45, paddingRight: 20,
                      }}
                    >
                      {rule.title}
                    </span>
                  )}

                  <button
                    className="rule-del"
                    onClick={() => setDeleteId(rule.id)}
                    style={{
                      position: "absolute", top: 10, right: 12,
                      background: "transparent", border: "none",
                      color: RED, opacity: 0, cursor: "pointer",
                      fontSize: 20, lineHeight: 1, padding: 2,
                      transition: "opacity 0.15s",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Inline new rule card */}
              {addingRuleInCategory === cat && (
                <div
                  style={{
                    background: "rgba(192,57,43,0.05)",
                    border: `1.5px dashed ${RED_MID}`,
                    borderRadius: 16, padding: "28px 24px",
                    minHeight: 130, display: "flex", alignItems: "center",
                  }}
                >
                  <input
                    ref={newRuleInputRef}
                    value={newRuleDraft}
                    onChange={(e) => setNewRuleDraft(e.target.value)}
                    placeholder="Write the rule…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addRule(cat)
                      if (e.key === "Escape") { setAddingRuleInCategory(null); setNewRuleDraft("") }
                    }}
                    onBlur={() => void addRule(cat)}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      fontFamily: "inherit", fontSize: "1.15rem", fontWeight: 700,
                      color: "#fff", padding: 0, width: "100%", lineHeight: 1.4,
                    }}
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
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#1a0e0e", borderRadius: 14, border: `1.5px solid ${RED_BORDER}`, boxShadow: "0 20px 40px rgba(0,0,0,0.5)", padding: 28, maxWidth: 300, width: "100%", textAlign: "center" }}
          >
            <p style={{ margin: "0 0 20px", color: "#fff", fontWeight: 700, fontSize: "1rem" }}>Delete this rule?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${RED_BORDER}`, background: "transparent", color: RED, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => void deleteRule(deleteId)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: RED, color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
