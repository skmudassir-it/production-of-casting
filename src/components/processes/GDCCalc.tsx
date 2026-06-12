"use client";

import { useState, useMemo } from "react";
import { GDC_DEFAULTS, computeGDC, gdcChecks, GDC_DOC, GDC_FAQ } from "../engines/gdc";

// ═══════════ SHARED UI ═══════════

const fmt = (v: number, d = 2): string =>
  !isFinite(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });

const Out = ({ label, val, unit, hi }: { label: string; val: string; unit: string; hi?: boolean }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      borderBottom: "1px dashed #2b2f37",
      ...(hi
        ? { background: "linear-gradient(90deg, rgba(255,122,26,0.10), transparent)", borderRadius: 4 }
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
    <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#ffb066" }}>{title}</h3>
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

// ═══════════ STYLES ═══════════

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#15171b",
  color: "#e8e6e1",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  padding: "24px 18px 60px",
  maxWidth: 1180,
  margin: "0 auto",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 14,
};

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.22em",
  color: "#ff7a1a",
  fontWeight: 700,
  marginBottom: 6,
};

const h1: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 800 };

const tabs: React.CSSProperties = {
  display: "flex",
  gap: 8,
  margin: "16px 0 22px",
  flexWrap: "wrap",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(300px, 420px) 1fr",
  gap: 26,
  alignItems: "start",
};

const colTitle: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#9aa0ab",
  borderBottom: "2px solid #ff7a1a",
  paddingBottom: 8,
  margin: "0 0 14px",
};

const checkGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "10px 1fr auto",
  gap: "2px 10px",
  alignItems: "center",
  padding: "7px 0",
  borderBottom: "1px dashed #2b2f37",
};

// Doc styles
const docH: React.CSSProperties = {
  color: "#ffb066",
  fontSize: 16,
  fontWeight: 700,
  margin: "26px 0 8px",
};

const docP: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.75,
  color: "#c9cdd5",
  margin: "8px 0",
};

const formula: React.CSSProperties = {
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
};

const faqQ: React.CSSProperties = {
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  margin: "20px 0 6px",
};

const faqA: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.75,
  color: "#c9cdd5",
  margin: "0 0 8px",
};

const footer: React.CSSProperties = {
  marginTop: 28,
  fontSize: 11.5,
  color: "#6e7480",
  textAlign: "center",
};

const sectionList: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.85,
  color: "#c9cdd5",
  paddingLeft: 18,
  margin: "4px 0",
};

const statusPill = (ok: boolean): React.CSSProperties => ({
  border: "1px solid",
  borderColor: ok ? "#2ecc71" : "#ff5c33",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: ok ? "#2ecc71" : "#ff5c33",
});

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

const TAB_LABELS = ["Calculator", "Documentation", "FAQ"] as const;
type Tab = (typeof TAB_LABELS)[number];

// ═══════════ FIELD DEFINITIONS ═══════════

const FIELDS: { key: string; label: string; unit?: string }[] = [
  { key: "pourHeight", label: "Pour height", unit: "mm" },
  { key: "sprueTopDia", label: "Sprue top diameter", unit: "mm" },
  { key: "sprueBottomDia", label: "Sprue bottom diameter", unit: "mm" },
  { key: "runnerArea", label: "Total runner area", unit: "mm²" },
  { key: "gateArea", label: "Total gate area", unit: "mm²" },
  { key: "castWt", label: "Casting weight (per cavity)", unit: "g" },
  { key: "alloyDensity", label: "Alloy density", unit: "g/cc" },
  { key: "cavities", label: "Number of cavities" },
  { key: "wallThk", label: "Wall thickness", unit: "mm" },
  { key: "gatingRatio", label: "Gating ratio (S:R:G)" },
  { key: "sectionThk", label: "Section thickness", unit: "mm" },
  { key: "meltTemp", label: "Melt temperature", unit: "°C" },
  { key: "dieTemp", label: "Die temperature", unit: "°C" },
  { key: "Cd", label: "Discharge coefficient, Cd" },
];

// ═══════════ MAIN COMPONENT ═══════════

export default function GDCCalc() {
  const [tab, setTab] = useState<Tab>("Calculator");
  const [inp, setInp] = useState<Record<string, string>>({ ...GDC_DEFAULTS });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInp((p) => ({ ...p, [key]: e.target.value }));

  const c = useMemo(() => computeGDC(inp), [inp]);
  const checks = useMemo(() => gdcChecks(inp, c), [inp, c]);
  const allOk = checks.every((x) => x.ok);

  // ════ CALCULATOR TAB ════
  const CalcPage = (
    <>
      <div style={grid}>
        {/* INPUTS */}
        <div className="no-print">
          <h2 style={colTitle}>Input variables</h2>
          <Sec title="Gating geometry">
            {FIELDS.filter(
              (f) =>
                f.key === "pourHeight" ||
                f.key === "sprueTopDia" ||
                f.key === "sprueBottomDia" ||
                f.key === "runnerArea" ||
                f.key === "gateArea" ||
                f.key === "gatingRatio"
            ).map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={inp[f.key] ?? ""}
                onChange={set(f.key)}
                unit={f.unit}
              />
            ))}
          </Sec>

          <Sec title="Casting">
            {FIELDS.filter(
              (f) =>
                f.key === "castWt" ||
                f.key === "alloyDensity" ||
                f.key === "cavities" ||
                f.key === "wallThk" ||
                f.key === "sectionThk"
            ).map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={inp[f.key] ?? ""}
                onChange={set(f.key)}
                unit={f.unit}
              />
            ))}
          </Sec>

          <Sec title="Process & constants">
            {FIELDS.filter(
              (f) => f.key === "meltTemp" || f.key === "dieTemp" || f.key === "Cd"
            ).map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={inp[f.key] ?? ""}
                onChange={set(f.key)}
                unit={f.unit}
              />
            ))}
          </Sec>
        </div>

        {/* OUTPUTS */}
        <div>
          <h2 style={colTitle}>Output parameters</h2>

          <Sec title="Process checks">
            {checks.map((x) => (
              <div key={x.label} style={checkGrid}>
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
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  {x.val}
                </span>
                <span style={{ gridColumn: "2 / 4", fontSize: 11, color: "#7d838e" }}>
                  {x.rule}
                </span>
              </div>
            ))}
          </Sec>

          <Sec title="Flow & fill">
            <Out label="Effective pour head" val={fmt(c.H_eff, 0)} unit="mm" />
            <Out label="Gate velocity" val={fmt(c.v_gate, 2)} unit="m/s" hi />
            <Out label="Sprue exit velocity" val={fmt(c.v_sprue, 2)} unit="m/s" />
            <Out label="Volumetric flow rate, Q" val={fmt(c.Q, 1)} unit="cc/s" />
            <Out label="Cavity volume, V" val={fmt(c.V, 1)} unit="cc" />
            <Out label="Pour time" val={fmt(c.t_pour, 2)} unit="s" hi />
            <Out label="Reynolds number, Re" val={fmt(c.Re, 0)} unit="—" />
          </Sec>

          <Sec title="Solidification & yield">
            <Out
              label="Solidification time"
              val={fmt(c.t_solid, 2)}
              unit="s"
              hi={c.t_solid <= c.t_pour}
            />
            <Out label="Casting yield" val={fmt(c.yieldPct, 1)} unit="%" hi />
            <Out label="Estimated runner weight" val={fmt(c.runnerWt, 1)} unit="g" />
            <Out label="Total poured weight" val={fmt(c.totalWt, 1)} unit="g" />
          </Sec>

          <Sec title="Gating ratio analysis">
            <Out label="Sprue exit area" val={fmt(c.sprueArea, 1)} unit="mm²" />
            <Out label="Target ratio (S:R:G)" val={inp.gatingRatio ?? "1:2:2"} unit="" />
            <Out
              label="Actual sprue-to-gate ratio"
              val={`${fmt(c.actualRatioSprue, 2)} : 1`}
              unit=""
            />
            <Out
              label="Actual runner-to-gate ratio"
              val={`${fmt(c.actualRatioRunner, 2)} : 1`}
              unit=""
            />
          </Sec>
        </div>
      </div>
    </>
  );

  // ════ DOCUMENTATION TAB ════
  const DocPage = (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div dangerouslySetInnerHTML={{ __html: GDC_DOC }} />
    </div>
  );

  // ════ FAQ TAB ════
  const FAQPage = (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      {GDC_FAQ.map(([q, a], i) => (
        <div key={i}>
          <div style={faqQ}>{q}</div>
          <div style={faqA}>{a}</div>
        </div>
      ))}
    </div>
  );

  // ════ RENDER ════
  return (
    <div style={page}>
      {/* HEADER */}
      <div style={header}>
        <div>
          <div style={eyebrow}>PROCESS CALCULATOR</div>
          <h1 style={h1}>Gravity Die Casting (GDC)</h1>
        </div>
        {tab === "Calculator" && (
          <div style={statusPill(allOk)}>{allOk ? "● PROCESS OK" : "● ATTENTION"}</div>
        )}
      </div>

      {/* TABS */}
      <div style={tabs}>
        {TAB_LABELS.map((t) => (
          <button key={t} style={tabStyle(t === tab)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {tab === "Calculator" && CalcPage}
      {tab === "Documentation" && DocPage}
      {tab === "FAQ" && FAQPage}

      {/* FOOTER */}
      <div style={footer}>
        GDC Process Calculator · Formulas adapted from NADCA Gating Manual, Campbell&apos;s{" "}
        <em>Castings</em>, and ASM Handbook Vol. 15
      </div>
    </div>
  );
}
