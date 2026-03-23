"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "./lib/supabase"
import ThemeToggle from "./components/ThemeToggle"
import { useTheme } from "./context/ThemeContext"

// ─── Shared card shell ────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "var(--t-panel)",
  borderRadius: 18,
  padding: "18px 18px 16px",
  width: 244,
  fontFamily: "var(--font-rubik), sans-serif",
  boxShadow: "0 20px 60px var(--t-p15), 0 4px 16px var(--t-p08)",
}

const DATE_LABEL: React.CSSProperties = {
  fontSize: "0.62rem",
  fontWeight: 700,
  color: "var(--t-icon)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  margin: "0 0 11px",
}

// ─── Habits card ──────────────────────────────────────────────────────────────

const HABITS = [
  { label: "Morning run", done: true  },
  { label: "Read 30 min", done: true  },
  { label: "Meditate",    done: false },
  { label: "Journal",     done: false },
]

function HabitsCard() {
  return (
    <div style={CARD}>
      <p style={DATE_LABEL}>Monday · March 23</p>
      {HABITS.map(({ label, done }) => (
        <div key={label} style={{
          background: done ? "#dcfce7" : "#fff",
          border: done ? "2px solid rgba(34,197,94,0.45)" : "1.5px solid var(--t-border)",
          borderRadius: 11,
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
          boxShadow: done ? "0 4px 12px rgba(34,197,94,0.13)" : "0 1px 4px var(--t-p05)",
        }}>
          {/* 6-dot drag handle */}
          <svg width="8" height="13" viewBox="0 0 10 16" fill="var(--t-icon)" style={{ flexShrink: 0 }}>
            <circle cx="2" cy="2"  r="1.5"/><circle cx="8" cy="2"  r="1.5"/>
            <circle cx="2" cy="8"  r="1.5"/><circle cx="8" cy="8"  r="1.5"/>
            <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
          </svg>
          {/* Square checkbox */}
          <div style={{
            width: 19, height: 19, borderRadius: 5, flexShrink: 0,
            background: done ? "#22c55e" : "transparent",
            border: done ? "2px solid #22c55e" : "2px solid var(--t-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: done ? "0 3px 8px rgba(34,197,94,0.38)" : "none",
          }}>
            {done && (
              <svg width="10" height="8" viewBox="0 0 13 10" fill="none">
                <path d="M1.5 5L5 8.5L11.5 1.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{
            fontSize: "0.8rem", fontWeight: 500,
            color: done ? "#166534" : "var(--t-primary)",
          }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Schedule card ────────────────────────────────────────────────────────────

const HOURS = ["07:00", "08:00", "09:00", "10:00", "11:00"]
const H = 34 // px per hour slot

const EVENTS = [
  { title: "Morning run",  start: 0, span: 1, color: "var(--t-primary)" },
  { title: "Deep work",    start: 2, span: 2, color: "#e07060" },
  { title: "Lunch",        start: 4, span: 1, color: "#4a9070" },
]

function ScheduleCard() {
  return (
    <div style={CARD}>
      <p style={DATE_LABEL}>Monday · March 23</p>
      <div style={{ position: "relative" }}>
        {HOURS.map((h) => (
          <div key={h} style={{ height: H, display: "flex", alignItems: "flex-start", borderTop: "1px solid var(--t-progress)" }}>
            <span style={{ fontSize: "0.58rem", fontWeight: 600, color: "var(--t-icon)", width: 34, paddingTop: 3, flexShrink: 0 }}>{h}</span>
          </div>
        ))}
        {EVENTS.map(({ title, start, span, color }) => (
          <div key={title} style={{
            position: "absolute",
            top: start * H + 1,
            left: 34,
            right: 0,
            height: span * H - 3,
            background: color,
            borderRadius: 7,
            borderLeft: "3px solid rgba(0,0,0,0.18)",
            padding: "4px 8px",
            color: "#fff",
            fontSize: "0.72rem",
            fontWeight: 600,
            overflow: "hidden",
            boxShadow: "0 2px 6px rgba(0,0,0,0.14)",
            display: "flex",
            alignItems: "center",
          }}>
            {title}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Goals card ───────────────────────────────────────────────────────────────

const GOALS = [
  { title: "Read 12 books",  current: 8,    target: 12   },
  { title: "Save $5,000",    current: 3200, target: 5000 },
]

function GoalsCard() {
  return (
    <div style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--t-primary)", margin: 0 }}>2025 Goals</p>
        <span style={{
          fontSize: "0.62rem", fontWeight: 700, color: "var(--t-primary)",
          background: "var(--t-p10)", border: "1px solid var(--t-p18)",
          borderRadius: 7, padding: "3px 8px",
        }}>
          45 days left
        </span>
      </div>

      {GOALS.map(({ title, current, target }) => {
        const pct = Math.round((current / target) * 100)
        return (
          <div key={title} style={{
            background: "#fff",
            border: "1.5px solid var(--t-border)",
            borderRadius: 11,
            padding: "11px 13px",
            marginBottom: 7,
            boxShadow: "0 2px 6px var(--t-p05)",
          }}>
            <p style={{ margin: "0 0 8px", fontSize: "0.78rem", fontWeight: 500, color: "var(--t-primary)" }}>{title}</p>
            {/* Progress bar */}
            <div style={{ height: 6, background: "var(--t-progress)", borderRadius: 4, overflow: "hidden", marginBottom: 5 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "var(--t-primary)", borderRadius: 4 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--t-icon)", fontWeight: 500 }}>{current} / {target}</span>
              <span style={{ fontSize: "0.65rem", color: "var(--t-primary)", fontWeight: 700 }}>{pct}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

const SLIDES = [
  { label: "Habits",   Card: HabitsCard   },
  { label: "Schedule", Card: ScheduleCard },
  { label: "Goals",    Card: GoalsCard    },
]

function MockupCarousel() {
  const [active, setActive] = useState(0)

  const arrowBtn: React.CSSProperties = {
    position: "absolute",
    top: "38%",
    transform: "translateY(-50%)",
    width: 28, height: 28, borderRadius: "50%",
    background: "var(--t-p12)",
    border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--t-primary)", transition: "background 0.2s",
    zIndex: 10,
  }

  return (
    <div style={{ position: "relative", width: 244 }}>
      <div style={{ position: "relative", height: 320 }}>
        {/* Left arrow */}
        <button
          onClick={() => setActive((a) => (a - 1 + 3) % 3)}
          style={{ ...arrowBtn, left: -38 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--t-p20)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--t-p12)")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Right arrow */}
        <button
          onClick={() => setActive((a) => (a + 1) % 3)}
          style={{ ...arrowBtn, right: -38 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--t-p20)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--t-p12)")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {SLIDES.map(({ Card }, i) => {
          const offset = (i - active + 3) % 3
          const transforms: Record<number, string> = {
            0: "rotate(0deg)   scale(1)    translateY(0px)",
            1: "rotate(2.5deg) scale(0.95) translateY(12px)",
            2: "rotate(-2deg)  scale(0.91) translateY(22px)",
          }
          const opacities  = [1, 0.55, 0.28]
          const zIndexes   = [3, 2, 1]

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0, left: 0,
                transform: transforms[offset],
                opacity: opacities[offset],
                zIndex: zIndexes[offset],
                pointerEvents: offset === 0 ? "auto" : "none",
                transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s",
              }}
            >
              <Card />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter()
  const { theme } = useTheme()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/goals")
    })
  }, [router])

  return (
    <>
      <style>{`
        .landing-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--t-bg);
          font-family: var(--font-rubik), sans-serif;
        }
        .landing-nav {
          display: flex;
          align-items: center;
          padding: 20px 40px;
          flex-shrink: 0;
        }
        .landing-hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 40px 48px;
        }
        .landing-inner {
          width: 100%;
          max-width: 960px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 48px;
        }
        .landing-left {
          flex: 0 0 auto;
          max-width: 440px;
        }
        .landing-right {
          flex: 0 0 auto;
        }
        .landing-cta {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .mobile-break { display: none; }
        @media (max-width: 640px) {
          .landing-nav {
            padding: 16px 24px;
          }
          .landing-hero {
            padding: 0 24px 48px;
            align-items: flex-start;
          }
          .landing-inner {
            flex-direction: column;
            align-items: center;
            gap: 0;
          }
          .landing-left {
            max-width: 100%;
            width: 100%;
            padding-top: 48px;
            text-align: center;
          }
          .landing-title {
            font-size: 3.2rem !important;
          }
          .landing-cta {
            justify-content: center;
          }
          .landing-right {
            margin-top: 96px;
            margin-bottom: 32px;
          }
          .mobile-break { display: inline; }
          .desktop-break { display: none; }
        }
      `}</style>

      <div className="landing-root">

        {/* Nav */}
        <nav className="landing-nav" style={{ justifyContent: "space-between" }}>
          <Image src={theme === "girl" ? "/logoP.png" : "/logo.png"} alt="MyRituals" width={148} height={37} style={{ objectFit: "contain" }} priority />
          <ThemeToggle />
        </nav>

        {/* Hero */}
        <div className="landing-hero">
          <div className="landing-inner">

            {/* Left */}
            <div className="landing-left">
              <h1 className="landing-title" style={{
                fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
                fontWeight: 800,
                color: "var(--t-heading)",
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                margin: "0 0 18px",
              }}>
                Your day,<br />beautifully<br />structured.
              </h1>

              <p style={{
                fontSize: "clamp(0.9rem, 1.8vw, 1rem)",
                color: "var(--t-muted)",
                lineHeight: 1.75,
                margin: "0 0 34px",
                fontWeight: 400,
              }}>
                Track your habits, plan your schedule,<br className="mobile-break" /> and reach your goals.<br className="mobile-break" /> All in one place.
              </p>

              <div className="landing-cta">
                <Link href="/signup" style={{
                  display: "inline-block",
                  padding: "13px 26px",
                  borderRadius: "12px",
                  background: "var(--t-primary)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                }}>
                  Get started free
                </Link>
                <Link href="/login" style={{
                  display: "inline-block",
                  padding: "13px 26px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.35)",
                  border: "1.5px solid var(--t-p25)",
                  color: "var(--t-primary)",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                }}>
                  Sign in
                </Link>
              </div>
            </div>

            {/* Right */}
            <div className="landing-right">
              <MockupCarousel />
            </div>

          </div>
        </div>

      </div>
    </>
  )
}
