"use client";

import { useState, useMemo } from "react";
import {
  VACUUM_DEFAULTS,
  computeVacuumHPDC,
  vacuumChecks,
  VACUUM_DOC,
  VACUUM_FAQ,
} from "../engines/vacuum-hpdc";

// ═══════════ SHARED UI HELPERS ═══════════
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
            background: "linear-gradient(90deg, rgba(255,122,26,0.10), transparent)",
            borderRadius: 4,
          }
        : {}),
    }}
  >
    <span style={{ fontSize: 12.5, color: "#b9bec8" }}>{label}</span>
    <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
      {val}
      <span style={{ fontSize: 11, fontWeight: 400, color: "#8a909b" }}> {unit}</span>
    </span>
  </div>
);

const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section
    style={{
      background: "#1d2026",
      border: "1px solid #2b2f37",
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 16,
    }}
  >
    <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#ffb066" }}>
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

// ═══════════ PAGE STYLES ═══════════
const st: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#15171b",
    color: "#e8e6e1",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "24px 18px 60px",
    maxWidth: 1100,
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
    whiteSpace: "pre-wrap",
  },
  faqQ: { color: "#fff", fontSize: 14, fontWeight: 700, margin: "20px 0 6px" },
  footer: { marginTop: 28, fontSize: 11.5, color: "#6e7480", textAlign: "center" },
  footerCredit: { marginTop: 6, fontSize: 11, color: "#555a63", textAlign: "center" },
  statusPill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
  },
  btnGhost: {
    background: "transparent",
    color: "#b9bec8",
    border: "1px solid #343943",
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 12.5,
    cursor: "pointer",
  },
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

// ═══════════ MAIN COMPONENT ═══════════
export default function VacuumCalc() {
  const [tab, setTab] = useState("calc");
  const [inp, setInp] = useState<Record<string, string>>({ ...VACUUM_DEFAULTS });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInp((p) => ({ ...p, [key]: e.target.value }));

  const c = useMemo(() => computeVacuumHPDC(inp), [inp]);
  const checks = useMemo(() => vacuumChecks(inp, c), [inp, c]);
  const allOk = checks.every((x) => x.ok);

  // ════ CALCULATOR TAB ════
  const CalcPage = (
    <div style={st.grid}>
      {/* INPUTS */}
      <div>
        <h2 style={st.colTitle}>Input variables</h2>

        <Sec title="Vacuum system">
          <Field label="Target vacuum level" value={inp.vacuumLevel} onChange={set("vacuumLevel")} unit="mbar" />
          <Field label="Cavity volume" value={inp.cavityVolume} onChange={set("cavityVolume")} unit="cc" />
          <Field label="Vent area" value={inp.ventArea} onChange={set("ventArea")} unit="mm²" />
          <Field label="Vacuum pump speed" value={inp.pumpSpeed} onChange={set("pumpSpeed")} unit="m³/h" />
          <Field label="Target evacuation time" value={inp.evacuationTime} onChange={set("evacuationTime")} unit="ms" />
        </Sec>

        <Sec title="Casting &amp; shot">
          <Field label="Plunger diameter, Dp" value={inp.plungerDia} onChange={set("plungerDia")} unit="mm" />
          <Field label="Shot weight" value={inp.shotWt} onChange={set("shotWt")} unit="g" />
          <Field label="Alloy density" value={inp.density} onChange={set("density")} unit="g/cc" />
          <Field label="Target gate velocity, Vg" value={inp.gateVelocity} onChange={set("gateVelocity")} unit="m/s" />
          <Field label="Target fill time" value={inp.fillTime} onChange={set("fillTime")} unit="ms" />
          <Field label="Coefficient of discharge, Cd" value={inp.Cd_discharge} onChange={set("Cd_discharge")} />
          <Field label="Wall thickness" value={inp.wallThk} onChange={set("wallThk")} unit="mm" />
        </Sec>

        <Sec title="Thermal constants &amp; alloy">
          <Field label="Melt temp entering die, Ti" value={inp.Ti} onChange={set("Ti")} unit="°C" />
          <Field label="Minimum flow temp, Tf" value={inp.Tf} onChange={set("Tf")} unit="°C" />
          <Field label="Die surface temp, Td" value={inp.Td} onChange={set("Td")} unit="°C" />
          <Field label="Empirical constant, k" value={inp.k} onChange={set("k")} unit="s/cm" />
          <Field label="Solid fraction at end of fill, S" value={inp.S} onChange={set("S")} unit="%" />
          <Field label="Conversion factor, Z" value={inp.Z} onChange={set("Z")} unit="°C" />
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
              <span style={{ fontSize: 12.5, color: "#d6d9df" }}>{x.label}</span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  textAlign: "right" as const,
                }}
              >
                {x.val}
              </span>
              <span style={{ gridColumn: "2 / 4", fontSize: 11, color: "#7d838e" }}>
                {x.rule}
              </span>
              <span
                style={{
                  gridColumn: "2 / 4",
                  fontSize: 11,
                  color: x.ok ? "#5fa88b" : "#e0886d",
                }}
              >
                {x.detail}
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              fontWeight: 700,
              color: allOk ? "#2ecc71" : "#ff5c33",
            }}
          >
            {allOk ? "● All checks pass" : "● Review required — see details above"}
          </div>
        </Sec>

        <Sec title="Air &amp; vacuum results">
          <Out label="Residual air mass" val={fmt(c.m_air, 4)} unit="mg" />
          <Out label="Initial air mass (atmospheric)" val={fmt(c.m_air_initial, 2)} unit="mg" />
          <Out label="Air removal efficiency" val={fmt(c.airRemovalEff, 1)} unit="%" hi />
          <Out label="Theoretical evacuation time" val={fmt(c.t_evac_theo, 1)} unit="ms" />
          <Out label="Porosity index" val={fmt(c.porosityIndex, 4)} unit="mg/g" hi />
          <Out label="Air volume in cavity" val={fmt(c.V_air, 1)} unit="mm³" />
          <Out label="Porosity volume fraction" val={fmt(c.f_porosity, 3)} unit="%" />
        </Sec>

        <Sec title="Fill &amp; gating">
          <Out label="Theoretical fill time" val={fmt(c.tFillTheo, 3)} unit="s" />
          <Out label="Shot volume" val={fmt(c.shotVol, 1)} unit="cc" />
          <Out label="Gate area" val={fmt(c.A_gate, 1)} unit="mm²" hi />
          <Out label="Actual gate velocity" val={fmt(c.Vg_actual, 1)} unit="m/s" />
          <Out label="Fill rate" val={fmt(c.fillRate, 0)} unit="cc/s" />
          <Out label="Gate fill rate" val={fmt(c.gateFillRate, 0)} unit="cc/s" />
        </Sec>

        <Sec title="Metal pressure &amp; plunger">
          <Out label="Metal pressure" val={fmt(c.metalP, 2)} unit="kgf/cm²" />
          <Out label="Plunger area" val={fmt(c.A_plunger, 0)} unit="mm²" />
          <Out label="Plunger velocity" val={fmt(c.plungerVel, 2)} unit="m/s" hi />
        </Sec>
      </div>
    </div>
  );

  // ════ DOCUMENTATION TAB ════
  // Render markdown as styled HTML text
  const renderDoc = (md: string) => {
    const lines = md.trim().split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Skip empty leading/trailing
      if (line.trim() === "" && i < 5) {
        i++;
        continue;
      }

      // ### Header
      if (line.match(/^###\s/)) {
        elements.push(
          <h3 key={key++} style={st.docH}>
            {line.replace(/^###\s+/, "")}
          </h3>
        );
        i++;
        continue;
      }

      // ## Header
      if (line.match(/^##\s/)) {
        elements.push(
          <h2 key={key++} style={{ ...st.colTitle, marginTop: 24 }}>
            {line.replace(/^##\s+/, "")}
          </h2>
        );
        i++;
        continue;
      }

      // Code block fence
      if (line.trim().startsWith("```")) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        elements.push(
          <code key={key++} style={st.formula}>
            {codeLines.join("\n")}
          </code>
        );
        continue;
      }

      // Pipe table line
      if (line.trim().startsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i]);
          i++;
        }
        // Render table as styled divs
        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .split("|")
            .filter(Boolean)
            .map((c) => c.trim());
          const bodyRows = tableLines.slice(2); // skip separator
          elements.push(
            <div key={key++} style={{ overflowX: "auto", margin: "12px 0" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12.5,
                }}
              >
                <thead>
                  <tr>
                    {headerCells.map((h, hi) => (
                      <th
                        key={hi}
                        style={{
                          textAlign: "left",
                          color: "#9aa0ab",
                          fontWeight: 600,
                          borderBottom: "1px solid #343943",
                          padding: "6px 8px",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, ri) => {
                    const cells = row
                      .split("|")
                      .filter(Boolean)
                      .map((c) => c.trim());
                    return (
                      <tr key={ri}>
                        {cells.map((cell, ci) => (
                          <td
                            key={ci}
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #23262c",
                              color: "#c9cdd5",
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // Regular paragraph (collect consecutive non-special lines)
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !lines[i].trim().startsWith("```") &&
        !lines[i].trim().startsWith("|") &&
        !lines[i].match(/^#{1,3}\s/)
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        const text = paraLines.join(" ").trim();
        if (text) {
          elements.push(
            <p key={key++} style={st.docP}>
              {text}
            </p>
          );
        }
      } else {
        i++; // skip empty line
      }
    }
    return elements;
  };

  const DocPage = (
    <div style={{ maxWidth: 820 }}>
      <h2 style={st.colTitle}>Documentation — Vacuum-Assisted HPDC Process Design</h2>
      {renderDoc(VACUUM_DOC)}
    </div>
  );

  // ════ FAQ TAB ════
  const FaqPage = (
    <div style={{ maxWidth: 820 }}>
      <h2 style={st.colTitle}>FAQ — Vacuum-Assisted HPDC</h2>
      {VACUUM_FAQ.map(([q, a]) => (
        <div key={q}>
          <div style={st.faqQ}>{q}</div>
          <p style={st.docP}>{a}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div style={st.page}>
      <style>{`
        input[type=number]{ -moz-appearance:textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
        input:focus, select:focus, button:focus { outline: 2px solid #ff7a1a; outline-offset: 1px; }
        @media (max-width: 880px){ .vac-grid{ grid-template-columns: 1fr !important; } }
      `}</style>

      <header style={st.header}>
        <div>
          <div style={st.eyebrow}>VACUUM HPDC · PROCESS DESIGN</div>
          <h1 style={st.h1}>Vacuum-Assisted HPDC</h1>
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
        Vacuum-assisted HPDC process design · formulas from ideal gas law, NADCA gating manual,
        and structural die casting industry practice
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
