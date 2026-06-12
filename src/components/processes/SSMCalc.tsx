"use client";

import { useState, useMemo } from "react";
import {
  SSM_DEFAULTS,
  computeSSM,
  ssmChecks,
  SSM_DOC,
  SSM_FAQ,
} from "../engines/ssm";

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
  btnPrint: {
    background: "transparent",
    color: "#b9bec8",
    border: "1px solid #343943",
    borderRadius: 7,
    padding: "8px 16px",
    fontSize: 12.5,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
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
    color: "#c9cdd5",
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
export default function SSMCalc() {
  const [tab, setTab] = useState("calc");
  const [inp, setInp] = useState<Record<string, string>>({ ...SSM_DEFAULTS });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInp((p) => ({ ...p, [key]: e.target.value }));

  const c = useMemo(() => computeSSM(inp), [inp]);
  const checks = useMemo(() => ssmChecks(inp, c), [inp, c]);
  const allOk = checks.every((x) => x.ok);

  // ════ CALCULATOR TAB ════
  const CalcPage = (
    <>
      <div style={st.grid}>
        {/* INPUTS */}
        <div className="no-print">
          <h2 style={st.colTitle}>Input variables</h2>

          <Sec title="Slurry &amp; thermal">
            <Field label="Target solid fraction" value={inp.solidFraction} onChange={set("solidFraction")} unit="%" />
            <Field label="Slurry temperature" value={inp.slurryTemp} onChange={set("slurryTemp")} unit="°C" />
            <Field label="Liquidus temperature" value={inp.liquidusTemp} onChange={set("liquidusTemp")} unit="°C" />
            <Field label="Solidus temperature" value={inp.solidusTemp} onChange={set("solidusTemp")} unit="°C" />
            <Field label="Slurry temp entering die, Ti" value={inp.Ti} onChange={set("Ti")} unit="°C" />
            <Field label="Minimum flow temp, Tf" value={inp.Tf} onChange={set("Tf")} unit="°C" />
            <Field label="Die surface temp, Td" value={inp.Td} onChange={set("Td")} unit="°C" />
            <Field label="Conversion factor, Z" value={inp.Z} onChange={set("Z")} unit="°C" />
          </Sec>

          <Sec title="Machine &amp; shot">
            <Field label="Plunger diameter, Dp" value={inp.plungerDia} onChange={set("plungerDia")} unit="mm" />
            <Field label="Shot weight" value={inp.shotWt} onChange={set("shotWt")} unit="g" />
            <Field label="Alloy density" value={inp.density} onChange={set("density")} unit="g/cc" />
          </Sec>

          <Sec title="Gating &amp; fill">
            <Field label="Gate area" value={inp.gateArea} onChange={set("gateArea")} unit="mm²" />
            <Field label="Gate velocity, Vg" value={inp.gateVelocity} onChange={set("gateVelocity")} unit="m/s" />
            <Field label="Target fill time" value={inp.fillTime} onChange={set("fillTime")} unit="s" />
            <Field label="Wall thickness" value={inp.wallThk} onChange={set("wallThk")} unit="mm" />
            <Field label="Section modulus" value={inp.sectionMod} onChange={set("sectionMod")} unit="mm" />
          </Sec>

          <Sec title="Rheology">
            <Field label="Consistency index, k" value={inp.kShape} onChange={set("kShape")} unit="Pa·s" />
            <Field label="Max shear rate" value={inp.maxShearRate} onChange={set("maxShearRate")} unit="1/s" />
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

          <Sec title="Slurry properties">
            <Out label="Solid fraction (target)" val={fmt(c.Fs, 1)} unit="%" hi />
            <Out label="Solid fraction (thermal estimate)" val={fmt(c.FsThermal, 1)} unit="%" />
            <Out label="Apparent viscosity, η" val={fmt(c.eta, 2)} unit="Pa·s" hi />
            <Out label="Power-law index, n" val={fmt(c.powerLawN, 3)} unit="" />
            <Out label="Power-law viscosity" val={fmt(c.etaPowerLaw, 3)} unit="Pa·s" />
            <Out label="Thixotropic index" val={fmt(c.thixoIndex, 1)} unit="" />
          </Sec>

          <Sec title="Fill analysis">
            <Out label="Flow rate, Q" val={fmt(c.Q, 0)} unit="cc/s" hi />
            <Out label="Cavity volume" val={fmt(c.cavityVol, 1)} unit="cc" />
            <Out label="Actual fill time" val={fmt(c.tFillActual, 4)} unit="s" />
            <Out label="Target fill time" val={fmt(c.tFillTarget, 4)} unit="s" />
            <Out label="Gate shear rate, γ̇" val={fmt(c.gammaDotGate, 0)} unit="1/s" />
            <Out label="Reynolds number, Re" val={fmt(c.ReSSM, 2)} unit="" hi />
            <Out label="Plunger velocity" val={fmt(c.vPlunger, 3)} unit="m/s" />
          </Sec>

          <Sec title="Solidification &amp; quality">
            <Out label="Solidification time" val={fmt(c.tSolid, 4)} unit="s" />
            <Out label="Theoretical fill time (thermal)" val={fmt(c.tFillTheo, 4)} unit="s" />
            <Out label="Porosity index" val={fmt(c.porosityIndex, 5)} unit="" hi />
            <Out label="Fill pressure" val={fmt(c.fillPressure, 2)} unit="kgf/cm²" />
          </Sec>

          <Sec title="Gate geometry">
            <Out label="Gate thickness" val={fmt(c.gateThickness, 1)} unit="mm" />
            <Out label="Gate width (estimated)" val={fmt(c.gateWidthEst, 1)} unit="mm" />
            <Out label="Fill ratio" val={fmt(c.fillRatio, 1)} unit="%" />
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
                    ["Solid fraction", "%", inp.solidFraction],
                    ["Slurry temperature", "°C", inp.slurryTemp],
                    ["Liquidus temperature", "°C", inp.liquidusTemp],
                    ["Solidus temperature", "°C", inp.solidusTemp],
                    ["Slurry temp entering die, Ti", "°C", inp.Ti],
                    ["Die surface temp, Td", "°C", inp.Td],
                    ["Plunger diameter", "mm", inp.plungerDia],
                    ["Shot weight", "g", inp.shotWt],
                    ["Alloy density", "g/cc", inp.density],
                    ["Gate area", "mm²", inp.gateArea],
                    ["Gate velocity", "m/s", inp.gateVelocity],
                    ["Fill time", "s", inp.fillTime],
                    ["Wall thickness", "mm", inp.wallThk],
                    ["Apparent viscosity", "Pa·s", fmt(c.eta, 2)],
                    ["Flow rate", "cc/s", fmt(c.Q, 0)],
                    ["Actual fill time", "s", fmt(c.tFillActual, 4)],
                    ["Reynolds number", "", fmt(c.ReSSM, 2)],
                    ["Solidification time", "s", fmt(c.tSolid, 4)],
                    ["Porosity index", "", fmt(c.porosityIndex, 5)],
                    ["Fill pressure", "kgf/cm²", fmt(c.fillPressure, 2)],
                    ["Gate thickness", "mm", fmt(c.gateThickness, 1)],
                    ["Gate width", "mm", fmt(c.gateWidthEst, 1)],
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

  // ════ DOCUMENTATION TAB ════
  // SSM_DOC is HTML, so render it directly via dangerouslySetInnerHTML
  const DocPage = (
    <div style={{ maxWidth: 820 }}>
      <h2 style={st.colTitle}>Documentation — SSM / Rheocasting Process Design</h2>
      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.75,
          color: "#c9cdd5",
        }}
        dangerouslySetInnerHTML={{
          __html: SSM_DOC.replace(
            /<code>/g,
            `<code style="display:block;background:#101216;border:1px solid #2b2f37;border-radius:6px;padding:8px 12px;font-family:Consolas,monospace;font-size:12.5px;color:#ffd9b3;margin:8px 0;overflow-x:auto;white-space:pre-wrap">`
          ).replace(
            /<h3/g,
            `<h3 style="color:#ffb066;font-size:16px;font-weight:700;margin:26px 0 8px"`
          ).replace(
            /<h2/g,
            `<h2 style="color:#ffb066;font-size:18px;font-weight:700;margin:30px 0 10px"`
          ).replace(
            /<p>/g,
            `<p style="margin:8px 0">`
          ).replace(
            /<b>/g,
            `<b style="color:#e8e6e1">`
          ),
        }}
      />
    </div>
  );

  // ════ FAQ TAB ════
  const FaqPage = (
    <div style={{ maxWidth: 820 }}>
      <h2 style={st.colTitle}>FAQ — SSM / Rheocasting</h2>
      {SSM_FAQ.map(([q, a]) => (
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
        @media (max-width: 880px){ .ssm-grid{ grid-template-columns: 1fr !important; } }
        @media print {
          @page { size: A4; margin: 12mm 14mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body, body > div, body > div > div {
            background: #fff !important; color: #111 !important;
          }
          .no-print { display: none !important; }
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
          <div style={st.eyebrow}>PRODUCTION OF CASTING · SSM</div>
          <h1 style={st.h1}>Semi-Solid / Rheocasting</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {tab === "calc" && (
            <>
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
              <button style={st.btnPrint} onClick={() => window.print()} title="Print calculator">
                🖨 Print
              </button>
            </>
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

      {tab === "calc" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            style={{
              background: "#2ecc71",
              color: "#15171b",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() =>
              setInp({
                ...SSM_DEFAULTS,
                solidFraction: "45",
                gateArea: "180",
                gateVelocity: "3",
                wallThk: "4",
                sectionMod: "6",
              })
            }
          >
            ✨ Optimize — Pre-fill manufacturable values
          </button>
        </div>
      )}

      {tab === "calc" ? CalcPage : tab === "doc" ? DocPage : FaqPage}

      <footer style={st.footer}>
        SSM / Rheocasting process design · slurry rheology from semi-solid metal literature,
        Chvorinov solidification modified for pre-solidified fraction
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
