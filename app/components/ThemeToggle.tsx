"use client"

import { useTheme } from "../context/ThemeContext"

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <div
      onClick={toggle}
      title={`Switch to ${theme === "boy" ? "girl" : "boy"} theme`}
      style={{
        display: "flex", alignItems: "center",
        background: "var(--t-p10)", border: "1.5px solid var(--t-p25)",
        borderRadius: 20, padding: "3px 4px", cursor: "pointer", gap: 2,
      }}
    >
      {(["boy", "girl"] as const).map((t) => (
        <div key={t} style={{
          padding: "3px 9px", borderRadius: 14, fontWeight: 700, fontSize: "0.75rem",
          background: theme === t ? "var(--t-primary)" : "transparent",
          color: theme === t ? "#fff" : "var(--t-muted)",
          transition: "all 0.25s",
        }}>
          {t === "boy" ? "♂" : "♀"}
        </div>
      ))}
    </div>
  )
}
