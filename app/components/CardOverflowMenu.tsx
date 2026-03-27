"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

type Props = {
  onRename: () => void
  onDelete: () => void
  ariaLabel?: string
  /** Distance from card top edge (px) */
  offsetTop?: number
  /** Distance from card right edge (px) */
  offsetRight?: number
}

export default function CardOverflowMenu({
  onRename,
  onDelete,
  ariaLabel = "Card actions",
  offsetTop = 14,
  offsetRight = 14,
}: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const updateMenuPosition = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
    window.addEventListener("scroll", updateMenuPosition, true)
    window.addEventListener("resize", updateMenuPosition)
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true)
      window.removeEventListener("resize", updateMenuPosition)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [open])

  const menuPanel =
    open &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: "fixed",
          top: menuPos.top,
          right: menuPos.right,
          zIndex: 10000,
          minWidth: 132,
          padding: 6,
          borderRadius: 10,
          border: "1px solid var(--t-border)",
          background: "var(--t-panel)",
          boxShadow: "0 10px 28px var(--t-p15)",
        }}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onRename()
            setOpen(false)
          }}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "8px 10px",
            border: "none",
            borderRadius: 6,
            background: "transparent",
            color: "var(--t-primary)",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Rename
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onDelete()
            setOpen(false)
          }}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "8px 10px",
            border: "none",
            borderRadius: 6,
            background: "transparent",
            color: "#d92d20",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Delete
        </button>
      </div>,
      document.body,
    )

  return (
    <>
      {menuPanel}
      <div
        ref={wrapRef}
        className="card-overflow-menu"
        style={{ position: "absolute", top: offsetTop, right: offsetRight, zIndex: 3 }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          ref={triggerRef}
          type="button"
          className="card-overflow-trigger"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "1px solid transparent",
            background: open ? "var(--t-p08)" : "transparent",
            color: "var(--t-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.55,
            transition: "opacity 0.2s, background 0.2s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>
    </>
  )
}
