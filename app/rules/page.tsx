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

        .rule-card {
          background: #1a1010;
          border: 1.5px solid rgba(192,57,43,0.2);
          border-radius: 16px;
          padding: 32px 28px;
          position: relative;
          min-height: 160px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          cursor: default;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .rule-card:hover {
          border-color: rgba(192,57,43,0.6);
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(192,57,43,0.2);
        }
        .rule-card:hover .rule-del {
          opacity: 1 !important;
        }
        .rule-card-text {
          font-size: clamp(1.25rem, 2vw, 1.6rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }
        .add-rule-card {
          background: transparent;
          border: 1.5px dashed rgba(192,57,43,0.25);
          border-radius: 16px;
          padding: 32px 28px;
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .add-rule-card:hover {
          border-color: rgba(192,57,43,0.55);
          background: rgba(192,57,43,0.04);
        }
        .add-rule-card-input {
          background: transparent;
          border: 1.5px dashed rgba(192,57,43,0.4);
          border-radius: 16px;
          padding: 32px 28px;
          min-height: 160px;
          display: flex;
          align-items: flex-end;
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#111", fontFamily: "var(--font-rubik), system-ui, sans-serif" }}>

        {/* Fixed top-right */}
        <div style={{ position: "fixed", top: 28, right: 32, zIndex: 50 }}>
          <button
            onClick={() => setAddingCategory(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 20px", borderRadius: 8,
              border: "1.5px solid rgba(192,57,43,0.4)",
              background: "transparent", color: "#c0392b",
              fontWeight: 700, fontSize: "0.75rem",
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.15s",
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
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 90vw)" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 20, opacity: 0.6 }}>
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
                  borderBottom: "2px solid #c0392b", padding: "14px 0",
                  color: "#fff", fontSize: "clamp(2rem, 5vw, 3rem)",
                  fontWeight: 900, fontFamily: "inherit", outline: "none",
                  letterSpacing: "-0.02em",
                }}
              />
              <div style={{ marginTop: 16, fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>
                Enter to confirm · Esc to cancel
              </div>
            </div>
          </div>
        )}

        {/* Page body */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px 120px" }}>

          {/* Empty */}
          {allCategories.length === 0 && (
            <div style={{ marginTop: "35vh", textAlign: "center" }}>
              <div style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 900, color: "rgba(255,255,255,0.05)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
                No rules.<br />No standards.<br />No code.
              </div>
              <div style={{ marginTop: 48, fontSize: "0.72rem", color: "#c0392b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.5 }}>
                Add a category to begin
              </div>
            </div>
          )}

          {allCategories.map((cat) => (
            <div key={cat} style={{ marginBottom: 72 }}>

              {/* Category title — BIG */}
              <div style={{ marginBottom: 28, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24 }}>
                <h2 style={{
                  fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)",
                  fontWeight: 900,
                  color: "#c0392b",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  textTransform: "uppercase",
                }}>
                  {cat}
                </h2>
                <button
                  onClick={() => { setAddingRuleInCategory(cat); setNewRuleDraft("") }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 16px", borderRadius: 7,
                    border: "1px solid rgba(192,57,43,0.35)",
                    background: "transparent", color: "#c0392b",
                    fontWeight: 700, fontSize: "0.72rem",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: "pointer", fontFamily: "inherit",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Rule
                </button>
              </div>

              {/* Cards grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {(grouped[cat] ?? []).map((rule) => (
                  <div key={rule.id} className="rule-card">
                    {/* Red accent line top */}
                    <div style={{ position: "absolute", top: 0, left: 28, right: 28, height: 2, background: "#c0392b", borderRadius: "0 0 2px 2px", opacity: 0.5 }} />

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
                          background: "transparent", border: "none", outline: "none",
                          fontFamily: "inherit",
                          fontSize: "clamp(1.25rem, 2vw, 1.6rem)",
                          fontWeight: 800, color: "#fff",
                          width: "100%", padding: 0,
                          letterSpacing: "-0.02em", lineHeight: 1.25,
                        }}
                      />
                    ) : (
                      <span
                        className="rule-card-text"
                        onDoubleClick={() => { setEditingId(rule.id); setDraft(rule.title) }}
                      >
                        {rule.title}
                      </span>
                    )}

                    <button
                      className="rule-del"
                      onClick={() => setDeleteId(rule.id)}
                      style={{
                        position: "absolute", top: 12, right: 14,
                        background: "transparent", border: "none",
                        color: "#c0392b", opacity: 0,
                        fontSize: "1.3rem", lineHeight: 1,
                        cursor: "pointer", transition: "opacity 0.15s",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Inline add input card */}
                {addingRuleInCategory === cat && (
                  <div className="add-rule-card-input">
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
                        background: "transparent", border: "none", outline: "none",
                        fontFamily: "inherit",
                        fontSize: "clamp(1.25rem, 2vw, 1.6rem)",
                        fontWeight: 800, color: "rgba(255,255,255,0.4)",
                        width: "100%", padding: 0,
                        letterSpacing: "-0.02em", lineHeight: 1.25,
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
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#1a1010", borderRadius: 14, border: "1px solid rgba(192,57,43,0.3)", padding: "36px 40px", maxWidth: 320, width: "100%", textAlign: "center" }}
          >
            <p style={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", marginBottom: 28 }}>Delete this rule?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "10px 22px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => void deleteRule(deleteId)} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
