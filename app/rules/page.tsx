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
        html, body { background: #111; }

        .rule-item {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 28px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
          transition: padding-left 0.2s;
        }
        .rule-item:last-child {
          border-bottom: none;
        }
        .rule-item:hover {
          padding-left: 6px;
        }
        .rule-item:hover .rule-del {
          opacity: 1 !important;
        }
        .rule-num {
          font-size: 0.75rem;
          font-weight: 800;
          color: #c0392b;
          opacity: 0.5;
          min-width: 28px;
          padding-top: 8px;
          letter-spacing: 0.06em;
          flex-shrink: 0;
        }
        .rule-text {
          font-size: clamp(1.5rem, 2.8vw, 2.2rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
          letter-spacing: -0.02em;
          flex: 1;
        }
        .add-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.15s;
        }
        .add-btn:hover { opacity: 0.7; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#111",
        fontFamily: "var(--font-rubik), system-ui, sans-serif",
      }}>

        {/* Fixed top-right controls */}
        <div style={{ position: "fixed", top: 28, right: 32, zIndex: 50, display: "flex", gap: 12 }}>
          <button
            className="add-btn"
            onClick={() => setAddingCategory(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 8,
              border: "1.5px solid rgba(192,57,43,0.4)",
              color: "#c0392b",
              fontWeight: 700, fontSize: "0.78rem",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Category
          </button>
        </div>

        {/* New category input */}
        {addingCategory && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
            onClick={() => { setAddingCategory(false); setNewCategoryDraft("") }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 90vw)" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16, opacity: 0.7 }}>
                New Category
              </div>
              <input
                ref={newCatInputRef}
                value={newCategoryDraft}
                onChange={(e) => setNewCategoryDraft(e.target.value)}
                placeholder="e.g. Religion, Health, Money…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addCategory()
                  if (e.key === "Escape") { setAddingCategory(false); setNewCategoryDraft("") }
                }}
                style={{
                  width: "100%", background: "transparent",
                  border: "none", borderBottom: "2px solid #c0392b",
                  padding: "12px 0", color: "#fff",
                  fontSize: "2rem", fontWeight: 800, fontFamily: "inherit",
                  outline: "none", letterSpacing: "-0.02em",
                }}
              />
              <div style={{ marginTop: 20, fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                Press Enter to confirm · Esc to cancel
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 40px 120px" }}>

          {/* Empty state */}
          {allCategories.length === 0 && (
            <div style={{ marginTop: "30vh", textAlign: "center" }}>
              <div style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, color: "rgba(255,255,255,0.06)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                No rules.<br />No code.<br />No standards.
              </div>
              <div style={{ marginTop: 40, fontSize: "0.8rem", color: "#c0392b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6 }}>
                Create a category to begin →
              </div>
            </div>
          )}

          {/* Categories */}
          {allCategories.map((cat, catIdx) => (
            <div key={cat} style={{ marginBottom: 72 }}>

              {/* Category label */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
                <div style={{
                  fontSize: "0.65rem", fontWeight: 900, color: "#c0392b",
                  textTransform: "uppercase", letterSpacing: "0.18em", opacity: 0.55,
                }}>
                  {cat}
                </div>
                <button
                  className="add-btn"
                  onClick={() => { setAddingRuleInCategory(cat); setNewRuleDraft("") }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    color: "rgba(255,255,255,0.2)", fontSize: "0.7rem",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(192,57,43,0.3)", marginBottom: 0 }} />

              {/* Rules list */}
              <div>
                {(grouped[cat] ?? []).map((rule, idx) => (
                  <div key={rule.id} className="rule-item">
                    <span className="rule-num">{String(idx + 1).padStart(2, "0")}</span>
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
                          fontFamily: "inherit",
                          fontSize: "clamp(1.5rem, 2.8vw, 2.2rem)",
                          fontWeight: 800, color: "#fff",
                          padding: 0, letterSpacing: "-0.02em", lineHeight: 1.2,
                        }}
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
                        background: "transparent", border: "none",
                        color: "#c0392b", opacity: 0, cursor: "pointer",
                        fontSize: "1.4rem", lineHeight: 1, paddingTop: 6,
                        transition: "opacity 0.15s", flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Inline new rule */}
                {addingRuleInCategory === cat && (
                  <div className="rule-item" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="rule-num">{String((grouped[cat]?.length ?? 0) + 1).padStart(2, "0")}</span>
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
                      style={{
                        flex: 1, background: "transparent", border: "none", outline: "none",
                        fontFamily: "inherit",
                        fontSize: "clamp(1.5rem, 2.8vw, 2.2rem)",
                        fontWeight: 800, color: "rgba(255,255,255,0.35)",
                        padding: 0, letterSpacing: "-0.02em", lineHeight: 1.2,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div
          onClick={() => setDeleteId(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a", borderRadius: 12,
              border: "1px solid rgba(192,57,43,0.3)",
              padding: "32px 36px", maxWidth: 320, width: "100%", textAlign: "center",
            }}
          >
            <p style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", marginBottom: 24 }}>Delete this rule?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => void deleteRule(deleteId)} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
