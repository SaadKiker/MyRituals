"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAppUser } from "../layout"

type Rule = {
  id: string
  user_id: string
  title: string
  category: string
  sort_order: number
}

const RED = "#b03a2e"
const RED_LIGHT = "rgba(176, 58, 46, 0.07)"
const RED_BORDER = "rgba(176, 58, 46, 0.18)"
const RED_MID = "rgba(176, 58, 46, 0.28)"

export default function RulesPage() {
  const user = useAppUser()
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
    supabase
      .from("rules")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setRules((data as Rule[]) ?? [])
        setLoading(false)
      })
  }, [user.id])

  // Focus new rule input when a category opens
  useEffect(() => {
    if (addingRuleInCategory) {
      setTimeout(() => newRuleInputRef.current?.focus(), 50)
    }
  }, [addingRuleInCategory])

  useEffect(() => {
    if (addingCategory) {
      setTimeout(() => newCatInputRef.current?.focus(), 50)
    }
  }, [addingCategory])

  // Group rules by category, preserving insertion order of categories
  const categoryOrder: string[] = []
  const grouped: Record<string, Rule[]> = {}
  for (const r of rules) {
    if (!grouped[r.category]) {
      grouped[r.category] = []
      categoryOrder.push(r.category)
    }
    grouped[r.category].push(r)
  }

  async function addRule(category: string) {
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
    // Create a placeholder rule to anchor the category, then immediately enter add-rule mode
    // Actually, just open the add-rule flow for the new category
    setAddingCategory(false)
    setNewCategoryDraft("")
    setNewRuleDraft("")
    setAddingRuleInCategory(cat)
  }

  async function startEdit(rule: Rule) {
    setEditingId(rule.id)
    setDraft(rule.title)
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

  const isEmpty = rules.length === 0 && !addingRuleInCategory

  return (
    <>
      <style>{`
        .rule-card {
          transition: box-shadow 0.18s, transform 0.18s;
        }
        .rule-card:hover {
          box-shadow: 0 6px 20px rgba(176,58,46,0.14) !important;
          transform: translateY(-1px);
        }
        .rule-card:hover .rule-del {
          opacity: 1 !important;
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "90px auto 0", padding: "0 20px 60px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 48, borderBottom: `1.5px solid ${RED_BORDER}`, paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, opacity: 0.7 }}>
                Personal Code
              </div>
              <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: RED, lineHeight: 1.1 }}>
                My Rules
              </h1>
            </div>
            <button
              onClick={() => { setAddingCategory(true) }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 10,
                border: `1.5px solid ${RED_BORDER}`,
                background: RED_LIGHT,
                color: RED,
                fontWeight: 700, fontSize: "0.85rem",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Category
            </button>
          </div>
        </div>

        {/* New category input */}
        {addingCategory && (
          <div style={{ marginBottom: 32, display: "flex", gap: 10 }}>
            <input
              ref={newCatInputRef}
              value={newCategoryDraft}
              onChange={(e) => setNewCategoryDraft(e.target.value)}
              placeholder="Category name (e.g. Religion, Health…)"
              onKeyDown={(e) => {
                if (e.key === "Enter") void addCategory()
                if (e.key === "Escape") { setAddingCategory(false); setNewCategoryDraft("") }
              }}
              style={{
                flex: 1, background: RED_LIGHT, border: `1.5px solid ${RED_BORDER}`,
                borderRadius: 10, padding: "10px 14px", color: RED,
                fontSize: "1rem", fontWeight: 600, fontFamily: "inherit", outline: "none",
              }}
            />
            <button
              onClick={addCategory}
              style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: RED, color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}
            >
              Create
            </button>
            <button
              onClick={() => { setAddingCategory(false); setNewCategoryDraft("") }}
              style={{ padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${RED_BORDER}`, background: "transparent", color: RED, fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div style={{ textAlign: "center", marginTop: 80, color: RED, opacity: 0.45 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>No rules yet</div>
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>Create a category to get started</div>
          </div>
        )}

        {/* Categories */}
        {categoryOrder.map((cat) => (
          <div key={cat} style={{ marginBottom: 48 }}>
            {/* Category label */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: RED, flexShrink: 0 }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: RED, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {cat}
              </span>
              <div style={{ flex: 1, height: 1, background: RED_BORDER }} />
              <button
                onClick={() => { setAddingRuleInCategory(cat); setNewRuleDraft("") }}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "5px 12px", borderRadius: 8,
                  border: `1px solid ${RED_BORDER}`, background: RED_LIGHT,
                  color: RED, fontWeight: 600, fontSize: "0.75rem",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Rule
              </button>
            </div>

            {/* Rules grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {grouped[cat].map((rule) => (
                <div
                  key={rule.id}
                  className="rule-card"
                  style={{
                    background: RED_LIGHT,
                    border: `1.5px solid ${RED_BORDER}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    position: "relative",
                    boxShadow: `0 2px 8px rgba(176,58,46,0.07)`,
                    minHeight: 64,
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
                        fontFamily: "inherit", fontSize: "0.92rem", fontWeight: 600, color: RED,
                        padding: 0, width: "100%",
                      }}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEdit(rule)}
                      style={{
                        flex: 1, fontSize: "0.92rem", fontWeight: 600, color: RED,
                        lineHeight: 1.4, cursor: "default", paddingRight: 24,
                      }}
                    >
                      {rule.title}
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    className="rule-del"
                    onClick={() => setDeleteId(rule.id)}
                    style={{
                      position: "absolute", top: 8, right: 8,
                      background: "transparent", border: "none",
                      color: RED, opacity: 0, cursor: "pointer",
                      padding: 2, lineHeight: 1, transition: "opacity 0.15s",
                      fontSize: 16, fontWeight: 300,
                    }}
                    title="Delete rule"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Inline new rule input for this category */}
              {addingRuleInCategory === cat && (
                <div
                  style={{
                    background: RED_LIGHT, border: `1.5px dashed ${RED_MID}`,
                    borderRadius: 12, padding: "16px 18px",
                    display: "flex", alignItems: "center", gap: 8, minHeight: 64,
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
                      fontFamily: "inherit", fontSize: "0.92rem", fontWeight: 600,
                      color: RED, padding: 0,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* New category that has no rules yet (inline rule input) */}
        {addingRuleInCategory && !categoryOrder.includes(addingRuleInCategory) && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: RED, flexShrink: 0 }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: RED, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {addingRuleInCategory}
              </span>
              <div style={{ flex: 1, height: 1, background: RED_BORDER }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              <div
                style={{
                  background: RED_LIGHT, border: `1.5px dashed ${RED_MID}`,
                  borderRadius: 12, padding: "16px 18px",
                  display: "flex", alignItems: "center", gap: 8, minHeight: 64,
                }}
              >
                <input
                  ref={newRuleInputRef}
                  value={newRuleDraft}
                  onChange={(e) => setNewRuleDraft(e.target.value)}
                  placeholder="Write the rule…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void addRule(addingRuleInCategory)
                    if (e.key === "Escape") { setAddingRuleInCategory(null); setNewRuleDraft("") }
                  }}
                  onBlur={() => void addRule(addingRuleInCategory)}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontFamily: "inherit", fontSize: "0.92rem", fontWeight: 600,
                    color: RED, padding: 0,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div
          onClick={() => setDeleteId(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--t-panel)", borderRadius: 14, border: `1.5px solid ${RED_BORDER}`, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", padding: 24, maxWidth: 300, width: "100%", textAlign: "center" }}
          >
            <p style={{ margin: "0 0 16px", color: RED, fontWeight: 700, fontSize: "0.95rem" }}>Delete this rule?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${RED_BORDER}`, background: "transparent", color: RED, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={() => void deleteRule(deleteId)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: RED, color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
