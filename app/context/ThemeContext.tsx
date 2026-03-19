"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "boy" | "girl"
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "boy", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("boy")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored === "girl") setTheme("girl")
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === "boy" ? "girl" : "boy") }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
