"use client";

import { useState, useMemo } from "react";
import {
  LPDC_DEFAULTS,
  computeLPDC,
  lpdcChecks,
  LPDC_DOC,
  LPDC_FAQ,
} from "../engines/lpdc";

// ────────────────────────────────────────────────────────────
// SHARED UI HELPERS (inline per project pattern)
// ────────────────────────────────────────────────────────────

const fmt = (v: number, d = 2): string =>
  !isFinite(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });

const Out = ({
  label,
  val,
  unit,
  hi,
}: {
  label: string;
  val: string;
  unit: string;
  hi?: boolean;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      borderBottom: "1px dashed #2b2f37",
      ...(hi
        ? {
            background:
              "linear-gradient(90deg, rgba(255,122,26,0.10), transparent)",
            borderRadius: 4,
          }
        : {}),
    }}
  >
    <span style={{ fontSize: 12.5, color: "#b9bec8" }}>{label}</span>
    <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
      {val}
      <span style={{ fontSize: 11, fontWeight: 400, color: "#8a909b" }}>
        {" "}
        {unit}
      </span>
    </span>
  </div>
);

const Sec = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section
    style={{
      background: "#1d2026",
      border: "1px solid #2b2f37",
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 16,
    }}
  >
    <h3
      style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#ffb066" }}
    >
      {title}
    </h3>
    {children}
  </section>
);

const Field = ({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
}) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "5px 0",
    }}
  >
    <span style={{ fontSize: 12.5, color: "#b9bec8", flex: 1 }}>{label}</span>
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="number"
        step="any"
        value={value}
        onChange={onChange}
        style={{
          background: "#101216",
          border: "1px solid #343943",
          borderRadius: 6,
          color: "#fff",
          padding: "6px 8px",
          width: 110,
          fontSize: 13,
        }}
      />
      {unit && <span style={{ fontSize: 11, color: "#7d838e", width: 46 }}>{unit}</span>}
    </span>
  </label>
);

// ────────────────────────────────────────────────────────────
// STYLES
// ────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#15171b",
    color: "#e8e6e1",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "24px 18px 60px",
    maxWidth: 1180,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: "0.22em",
    color: "#ff7a1a",
    fontWeight: 700,
    marginBottom: 6,
  },
  h1: { margin: 0, fontSize: 28, fontWeight: 800 },
  statusPill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
  },
  tabs: { display: "flex", gap: 8, margin: "16px 0 22px", flexWrap: "wrap" },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(300px, 420px) 1fr",
    gap: 26,
    alignItems: "start",
  },
  colTitle: {
    fontSize: 13,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#9aa0ab",
    borderBottom: "2px solid #ff7a1a",
    paddingBottom: 8,
    margin: "0 0 14px",
  },
  check: {
    display: "grid",
    gridTemplateColumns: "10px 1fr auto",
    gap: "2px 10px",
    alignItems: "center",
    padding: "7px 0",
    borderBottom: "1px dashed #2b2f37",
  },
  docH: { color: "#ffb066", fontSize: 16, fontWeight: 700, margin: "26px 0 8px" },
  docP: { fontSize: 13.5, lineHeight: 1.75, color: "#c9cdd5", margin: "8px 0" },
  formula: {
    display: "block",
    background: "#101216",
    border: "1px solid #2b2f37",
    borderRadius: 6,
    padding: "8px 12px",
    fontFamily: "Consolas, monospace",
    fontSize: 12.5,
    color: "#ffd9b3",
    margin: "8px 0",
    overflowX: "auto",
  },
  faqQ: { color: "#fff", fontSize: 14, fontWeight: 700, margin: "20px 0 6px" },
  footer: { marginTop: 28, fontSize: 11.5, color: "#6e7480", textAlign: "center" },
  footerCredit: {
    marginTop: 6,
    fontSize: 11,
    color: "#555a63",
    textAlign: "center",
  },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 12.5 },
  th: {
    textAlign: "left",
    color: "#9aa0ab",
    fontWeight: 600,
    borderBottom: "1px solid #343943",
    padding: "6px 6px",
  },
  td: {
    padding: "6px 6px",
    borderBottom: "1px solid #23262c",
    fontVariantNumeric: "tabular-nums",
  },
  docWrapper: { maxWidth: 820 },
  // Override styles inside the rendered doc HTML
  docHtmlH3: {
    color: "#ffb066",
    fontSize: 15,
    fontWeight: 700,
    margin: "22px 0 6px",
  },
  docHtmlP: { fontSize: 13.5, lineHeight: 1.75, color: "#c9cdd5", margin: "8px 0" },
  docHtmlPre: {
    display: "block",
    background: "#101216",
    border: "1px solid #2b2f37",
    borderRadius: 6,
    padding: "8px 12px",
    fontFamily: "Consolas, monospace",
    fontSize: 12.5,
    color: "#ffd9b3",
    margin: "8px 0",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  docHtmlUl: { fontSize: 13.5, lineHeight: 1.75, color: "#c9cdd5", paddingLeft: 20 },
  docHtmlLi: { margin: "4px 0" },
};

const tabStyle = (on: boolean): React.CSSProperties => ({
  background: on ? "#ff7a1a" : "#1d2026",
  color: on ? "#15171b" : "#b9bec8",
  border: "1px solid " + (on ? "#ff7a1a" : "#2b2f37"),
  borderRadius: 8,
  padding: "9px 18px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
});

// ────────────────────────────────────────────────────────────
// DOC HTML RENDERER — converts LPDC_DOC HTML string to React
// ────────────────────────────────────────────────────────────

function DocHtml({ html }: { html: string }) {
  // Simple parser: splits on <h3>, <p>, <pre>, <ul>, <li> tags
  // and renders with our themed styles
  const parts = html.split(/(<h3>.*?<\/h3>|<p>.*?<\/p>|<pre>.*?<\/pre>|<ul>.*?<\/ul>)/g);

  return (
    <div>
      {parts.map((part, i) => {
        if (part.startsWith("<h3>")) {
          const inner = part.replace(/<\/?h3>/g, "");
          return (
            <h3 key={i} style={st.docHtmlH3}>
              {parseInlineHtml(inner)}
            </h3>
          );
        }
        if (part.startsWith("<p>")) {
          const inner = part.replace(/<\/?p>/g, "").trim();
          if (!inner) return null;
          return (
            <p key={i} style={st.docHtmlP}>
              {parseInlineHtml(inner)}
            </p>
          );
        }
        if (part.startsWith("<pre>")) {
          const inner = part.replace(/<\/?pre>/g, "");
          return (
            <pre key={i} style={st.docHtmlPre}>
              {parseInlineHtml(inner)}
            </pre>
          );
        }
        if (part.startsWith("<ul>")) {
          const inner = part.replace(/<\/?ul>/g, "").trim();
          const items = inner
            .split(/<\/?li>/g)
            .filter((s) => s.trim())
            .map((s) => s.trim());
          return (
            <ul key={i} style={st.docHtmlUl}>
              {items.map((item, j) => (
                <li key={j} style={st.docHtmlLi}>
                  {parseInlineHtml(item)}
                </li>
              ))}
            </ul>
          );
        }
        return null;
      })}
    </div>
  );
}

/** Renders inline HTML elements: <strong>, <em>, <sub>, <a> */
function parseInlineHtml(html: string): React.ReactNode {
  // Replace HTML entities
  let s = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');

  // Split on inline tags
  const parts = s.split(/(<strong>.*?<\/strong>|<em>.*?<\/em>|<sub>.*?<\/sub>|<a\s.*?<\/a>)/g);

  return parts.map((part, i) => {
    if (part.startsWith("<strong>")) {
      return <strong key={i}>{part.replace(/<\/?strong>/g, "")}</strong>;
    }
    if (part.startsWith("<em>")) {
      return <em key={i}>{part.replace(/<\/?em>/g, "")}</em>;
    }
    if (part.startsWith("<sub>")) {
      return <sub key={i}>{part.replace(/<\/?sub>/g, "")}</sub>;
    }
    if (part.startsWith("<a ")) {
      const hrefMatch = part.match(/href="([^"]*)"/);
      const href = hrefMatch ? hrefMatch[1] : "#";
      const text = part.replace(/<a[^>]*>/, "").replace(/<\/a>/, "");
      return (
        <a key={i} href={href} style={{ color: "#ffb066" }}>
          {text}
        </a>
      );
    }
    return part;
  });
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────

export default function LPDCCalc() {
  const [tab, setTab] = useState("calc");
  const [inp, setInp] = useState({ ...LPDC_DEFAULTS });

  const set =
    (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setInp((p) => ({ ...p, [key]: e.target.value }));

  const c = useMemo(() => computeLPDC(inp), [inp]);
  const checks = useMemo(() => lpdcChecks(inp, c), [inp, c]);
  const allOk = checks.every((x) => x.ok);

  // ── CALCULATOR TAB ──────────────────────────────────────

  const CalcPage = (
    <>
      <div style={st.grid}>
        {/* INPUTS */}
        <div>
          <h2 style={st.colTitle}>Input variables</h2>

          <Sec title="Furnace &amp; Metal">
            <Field
              label="Furnace air pressure"
              value={inp.furnacePressure}
              onChange={set("furnacePressure")}
              unit="bar"
            />
            <Field
              label="Riser tube internal Ø"
              value={inp.riserTubeDia}
              onChange={set("riserTubeDia")}
              unit="mm"
            />
            <Field
              label="Melt temperature"
              value={inp.meltTemp}
              onChange={set("meltTemp")}
              unit="°C"
            />
            <Field
              label="Alloy density"
              value={inp.alloyDensity}
              onChange={set("alloyDensity")}
              unit="g/cc"
            />
          </Sec>

          <Sec title="Casting">
            <Field
              label="Casting height"
              value={inp.castingHeight}
              onChange={set("castingHeight")}
              unit="mm"
            />
            <Field
              label="Casting weight (per cavity)"
              value={inp.castWt}
              onChange={set("castWt")}
              unit="g"
            />
            <Field
              label="Number of cavities"
              value={inp.cavities}
              onChange={set("cavities")}
            />
            <Field
              label="Min. wall thickness"
              value={inp.wallThk}
              onChange={set("wallThk")}
              unit="mm"
            />
            <Field
              label="Total gate area"
              value={inp.gateArea}
              onChange={set("gateArea")}
              unit="mm²"
            />
          </Sec>

          <Sec title="Thermal constants">
            <Field
              label="Solid fraction at end of fill, S"
              value={inp.solidFraction}
              onChange={set("solidFraction")}
              unit="%"
            />
            <Field
              label="Thermal constant, k"
              value={inp.kThermal}
              onChange={set("kThermal")}
              unit="s/cm"
            />
            <Field
              label="Min. flow temperature, Tf"
              value={inp.Tf}
              onChange={set("Tf")}
              unit="°C"
            />
            <Field
              label="Conversion factor, Z"
              value={inp.Z}
              onChange={set("Z")}
              unit="°C"
            />
            <Field
              label="Die surface temperature"
              value={inp.dieTemp}
              onChange={set("dieTemp")}
              unit="°C"
            />
          </Sec>
        </div>

        {/* OUTPUTS */}
        <div>
          <h2 style={st.colTitle}>Output parameters</h2>

          <Sec title="Process checks">
            {checks.map((x) => (
              <div key={x.label} style={st.check}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    background: x.ok ? "#2ecc71" : "#ff5c33",
                  }}
                />
                <span style={{ fontSize: 12.5, color: "#d6d9df" }}>
                  {x.label}
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  {x.val}
                </span>
                <span
                  style={{
                    gridColumn: "2 / 4",
                    fontSize: 11,
                    color: "#7d838e",
                  }}
                >
                  {x.rule}
                </span>
              </div>
            ))}
          </Sec>

          <Sec title="Metal pressure">
            <Out label="Furnace pressure (metal)" val={fmt(c.P_MPa, 3)} unit="MPa" />
            <Out label="Furnace pressure (metal)" val={fmt(c.P_kgf, 2)} unit="kgf/cm²" hi />
            <Out
              label="Fill pressure head required"
              val={fmt(c.P_fill_MPa, 3)}
              unit="MPa"
            />
            <Out
              label="Fill pressure head required"
              val={fmt(c.P_fill_kgf, 2)}
              unit="kgf/cm²"
            />
            <Out
              label="Pressure adequacy"
              val={fmt(c.pressureAdequate, 2)}
              unit="× head"
              hi
            />
          </Sec>

          <Sec title="Fill dynamics">
            <Out label="Fill velocity (Bernoulli)" val={fmt(c.v, 3)} unit="m/s" hi />
            <Out label="Riser tube area" val={fmt(c.A_tube, 2)} unit="cm²" />
            <Out label="Volumetric flow rate, Q" val={fmt(c.Q, 1)} unit="cc/s" hi />
            <Out label="Total cavity volume, V" val={fmt(c.V, 1)} unit="cc" />
            <Out
              label="Actual fill time, t_fill"
              val={fmt(c.t_fill, 2)}
              unit="s"
              hi
            />
          </Sec>

          <Sec title="Gate &amp; flow quality">
            <Out label="Gate velocity, Vg" val={fmt(c.Vg, 2)} unit="m/s" hi />
            <Out label="Reynolds number, Re" val={fmt(c.Re, 0)} unit="" hi />
          </Sec>

          <Sec title="Thermal limits">
            <Out
              label="Theoretical fill time (thermal)"
              val={fmt(c.t_thermal, 2)}
              unit="s"
              hi
            />
            <Out
              label="Solidification time (Chvorinov)"
              val={fmt(c.t_solid, 2)}
              unit="s"
            />
          </Sec>

          <Sec title="Parameter sheet (for shop floor)">
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={st.th}>#</th>
                  <th style={st.th}>Parameter</th>
                  <th style={st.th}>Units</th>
                  <th style={st.th}>Design value</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Furnace pressure", "bar", inp.furnacePressure],
                    ["Riser tube internal Ø", "mm", inp.riserTubeDia],
                    ["Casting height", "mm", inp.castingHeight],
                    ["Casting weight (per cavity)", "g", inp.castWt],
                    ["Alloy density", "g/cc", inp.alloyDensity],
                    ["Melt temperature", "°C", inp.meltTemp],
                    ["Die surface temperature", "°C", inp.dieTemp],
                    ["Number of cavities", "", inp.cavities],
                    ["Min. wall thickness", "mm", inp.wallThk],
                    ["Gate area", "mm²", inp.gateArea],
                    ["Fill velocity", "m/s", fmt(c.v, 3)],
                    ["Flow rate", "cc/s", fmt(c.Q, 1)],
                    ["Fill time", "s", fmt(c.t_fill, 2)],
                    ["Gate velocity", "m/s", fmt(c.Vg, 2)],
                    ["Reynolds number", "", fmt(c.Re, 0)],
                    ["Thermal fill limit", "s", fmt(c.t_thermal, 2)],
                    ["Solidification time", "s", fmt(c.t_solid, 2)],
                  ] as [string, string, string][]
                ).map((row, i) => (
                  <tr key={i}>
                    <td style={st.td}>{i + 1}</td>
                    <td style={st.td}>{row[0]}</td>
                    <td style={st.td}>{row[1]}</td>
                    <td style={{ ...st.td, fontWeight: 600 }}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Sec>
        </div>
      </div>
    </>
  );

  // ── DOCUMENTATION TAB ────────────────────────────────────

  const DocPage = (
    <div style={st.docWrapper}>
      <h2 style={st.colTitle}>
        Documentation — LPDC process engineering
      </h2>
      <p style={st.docP}>
        Low Pressure Die Casting (LPDC) fills the die from below by pressurising
        the surface of a molten metal bath inside a sealed furnace. This
        calculator reproduces the standard LPDC process design formulas from
        handbooks (NADCA, FOSECO, Campbell).
      </p>
      <DocHtml html={LPDC_DOC} />
    </div>
  );

  // ── FAQ TAB ──────────────────────────────────────────────

  const FaqPage = (
    <div style={st.docWrapper}>
      <h2 style={st.colTitle}>FAQ — LPDC process calculator</h2>
      {LPDC_FAQ.map(([q, a]) => (
        <div key={q}>
          <div style={st.faqQ}>{q}</div>
          <p style={st.docP}>{a}</p>
        </div>
      ))}
    </div>
  );

  // ── RENDER ───────────────────────────────────────────────

  return (
    <div style={st.page}>
      <style>{`
        input[type=number]{ -moz-appearance:textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
        input:focus, select:focus, button:focus { outline: 2px solid #ff7a1a; outline-offset: 1px; }
        @media (max-width: 880px){ .lpdc-grid{ grid-template-columns: 1fr !important; } }
        @media print {
          @page { size: A4; margin: 12mm 14mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body, body > div, body > div > div {
            background: #fff !important; color: #111 !important;
          }
          section, [style*="background:#1d"], [style*="background: #1d"],
          [style*="background:#10"], [style*="background: #10"],
          [style*="background:#14"], [style*="background: #14"] {
            background: #fff !important; border-color: #ddd !important; box-shadow: none !important;
          }
          div[style*="color:#e8e6e1"], span[style*="color:#e8e6e1"],
          span[style*="color:#b9bec8"], span[style*="color: #b9bec8"],
          span[style*="color:#c9cdd5"], span[style*="color: #c9cdd5"],
          span[style*="color:#d6d9df"], span[style*="color: #d6d9df"],
          p[style*="color:#c9cdd5"], p[style*="color: #c9cdd5"] {
            color: #222 !important;
          }
          a { color: #0056b3 !important; }
        }
      `}</style>

      <header style={st.header}>
        <div>
          <div style={st.eyebrow}>LPDC PROCESS DESIGN · LOW PRESSURE DIE CASTING</div>
          <h1 style={st.h1}>LPDC Process Calculator</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {tab === "calc" && (
            <div
              style={{
                ...st.statusPill,
                background: allOk ? "#123d22" : "#46190f",
                borderColor: allOk ? "#2ecc71" : "#ff5c33",
                color: allOk ? "#7af2ae" : "#ffb09a",
              }}
            >
              {allOk ? "● ALL CHECKS PASS" : "● REVIEW REQUIRED"}
            </div>
          )}
        </div>
      </header>

      <nav style={st.tabs}>
        <button style={tabStyle(tab === "calc")} onClick={() => setTab("calc")}>
          Calculator
        </button>
        <button style={tabStyle(tab === "doc")} onClick={() => setTab("doc")}>
          Documentation
        </button>
        <button style={tabStyle(tab === "faq")} onClick={() => setTab("faq")}>
          FAQ
        </button>
      </nav>

      {tab === "calc" ? CalcPage : tab === "doc" ? DocPage : FaqPage}

      <footer style={st.footer}>
        LPDC process design · formulas adapted from NADCA, FOSECO, and Campbell&apos;s{" "}
        <em>Complete Casting Handbook</em>
      </footer>
      <div style={st.footerCredit}>
        Design &amp; developed by{" "}
        <a
          href="https://skmudassir.in"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#7d838e", textDecoration: "underline" }}
        >
          Mudassir Shaik
        </a>{" "}
        (skmudassir.in)
      </div>
    </div>
  );
}
