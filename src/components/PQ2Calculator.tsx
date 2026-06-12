"use client";

import { useState, useMemo, useEffect } from "react";

// ═══════════ MACHINE DATABASE (from PQ2 sheet cols AB:AG) ═══════════
const DEFAULT_MACHINES = [
  { name: "150 YOTA",          hydP: 120,    Dn: 102.6,  Vd: 4.5, pen: 110, stroke: 365 },
  { name: "150 ZITAI",         hydP: 100,    Dn: 112.6,  Vd: 4,   pen: 150, stroke: 365 },
  { name: "160 LK",            hydP: 130,    Dn: 100,    Vd: 4.5, pen: 135, stroke: 340 },
  { name: "250 TOSHIBA OLD",   hydP: 140,    Dn: 102.6,  Vd: 4.5, pen: 230, stroke: 415 },
  { name: "250 TOSHIBA CHINA", hydP: 148,    Dn: 115,    Vd: 4.5, pen: 230, stroke: 415 },
  { name: "250 YOTA",          hydP: 120,    Dn: 101,    Vd: 4.5, pen: 150, stroke: 415 },
  { name: "250 ZITAI",         hydP: 100,    Dn: 132.3,  Vd: 4,   pen: 215, stroke: 425 },
  { name: "280 LK",            hydP: 140,    Dn: 100.1,  Vd: 4.5, pen: 170, stroke: 400 },
  { name: "280 LK(N1)",        hydP: 140,    Dn: 100.1,  Vd: 4.5, pen: 140, stroke: 400 },
  { name: "280 LK(PLANT3)",    hydP: 140,    Dn: 100.1,  Vd: 4.5, pen: 160, stroke: 400 },
  { name: "400 LK",            hydP: 140,    Dn: 113.6,  Vd: 4.5, pen: 200, stroke: 500 },
  { name: "420 ZITAI (TPS)",   hydP: 100,    Dn: 133.1,  Vd: 4,   pen: 195, stroke: 515 },
  { name: "420 ZITAI (V2BP)",  hydP: 100,    Dn: 153.5,  Vd: 4,   pen: 195, stroke: 515 },
  { name: "560 ZITAI (TPS)",   hydP: 100,    Dn: 163.9,  Vd: 6,   pen: 250, stroke: 600 },
  { name: "630 LK",            hydP: 140,    Dn: 134.7,  Vd: 6,   pen: 250, stroke: 600 },
  { name: "650 YOTA (V2C)",    hydP: 120,    Dn: 138.2,  Vd: 6,   pen: 300, stroke: 630 },
  { name: "840T BUHLER",       hydP: 214.14, Dn: 137.17, Vd: 8.5, pen: 250, stroke: 700 },
  { name: "850 UBE",           hydP: 140,    Dn: 165,    Vd: 6,   pen: 355, stroke: 750 },
  { name: "1300 IDRA",         hydP: 160,    Dn: 171,    Vd: 6,   pen: 310, stroke: 750 },
  { name: "1600 IDRA",         hydP: 140,    Dn: 185,    Vd: 6,   pen: 310, stroke: 800 },
];
const ALLOYS = ["AlSi132", "ADC12", "A380", "AlSi9Cu3", "LM6", "AlSi10Mg"];

const DEFAULTS = {
  partNumber: "AF101562", partName: "COVER WATER PUMP", customer: "",
  machine: "250 TOSHIBA CHINA", Dp: "50",
  wallThk: "2.5", castWt: "157.47", overflowWt: "20", runnerWt: "228.2",
  biscuitThk: "20", cavities: "2", alloy: "AlSi132", density: "2.5",
  fixHousing: "200", diffuser: "20", Vg: "30", VgMin: "25", VgMax: "40",
  runnerRatio: "1.5", tFillTarget: "0.028", gateDepth: "2",
  k: "0.0346", Ti: "660", Tf: "580", Td: "180", S: "15", Z: "3.8", Cd: "0.3",
  projPerCavity: "45.41", overflowAreaRatio: "0.4", runnerAreaRatio: "0.6",
  specInjP: "800", machEff: "83.33", sideCore: "20", wedgeAngle: "10",
};

const fmt = (v: number, d = 2): string =>
  !isFinite(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });

type Machine = { name: string; hydP: number; Dn: number; Vd: number; pen: number; stroke: number };
type Inputs = typeof DEFAULTS;

// ═══════════ CALCULATION ENGINE ═══════════
function computePQ2(inp: Inputs, machines: Machine[]) {
  const n = (k: string) => { const v = parseFloat((inp as Record<string, string>)[k]); return isNaN(v) ? 0 : v; };
  const m = machines.find((x) => x.name === inp.machine) || {
    name: "—", hydP: 0, Dn: 1, Vd: 0, pen: 0, stroke: 0,
  };
  const Dp = n("Dp"), wallThk = n("wallThk"), castWt = n("castWt"),
    overflowWt = n("overflowWt"), runnerWt = n("runnerWt"),
    biscuitThk = n("biscuitThk"), cav = n("cavities"), rho = n("density"),
    fixH = n("fixHousing"), diff = n("diffuser"), Vg = n("Vg"),
    VgMin = n("VgMin"), VgMax = n("VgMax"),
    tFill = n("tFillTarget"), gateDepth = n("gateDepth"),
    k = n("k"), Ti = n("Ti"), Tf = n("Tf"), Td = n("Td"),
    S = n("S"), Z = n("Z"), Cd = n("Cd"),
    projPC = n("projPerCavity"), ofr = n("overflowAreaRatio"),
    rnr = n("runnerAreaRatio"), specP = n("specInjP"),
    eff = n("machEff"), sideCore = n("sideCore"), wedge = n("wedgeAngle");

  const biscuitWt = (((3.14 / 4) * Dp * Dp * biscuitThk) / 1000) * rho;
  const shotWt = (castWt + overflowWt) * cav + runnerWt + biscuitWt;
  const sleeveLen = (m.stroke - m.pen) + (fixH - diff);
  const Pm = (m.hydP * m.Dn * m.Dn) / (Dp * Dp);
  const Qm = m.Vd * (3.14 / 4) * Dp * Dp;
  const tFillTheo = k * ((Ti - Tf + S * Z) / (Tf - Td)) * wallThk;
  const castVol = ((castWt + overflowWt) * cav) / rho;
  const QTheo = castVol / tFillTheo;
  const Q = castVol / tFill;
  const metalP = (rho * 0.001 / 1962) * Math.pow((Vg * 100) / Cd, 2);
  const accP = metalP / ((m.Dn * m.Dn) / (Dp * Dp));
  const gateAreaTheo = QTheo / Math.sqrt((((metalP * 10000) * (2 * 9.81)) / (rho * 1000)) * Cd * Cd);
  const gateAreaTgt = Q / Vg;
  const gateWidth = gateAreaTgt / gateDepth;
  const runnerArea = gateAreaTgt * n("runnerRatio");
  const fillRatio = ((shotWt / rho) * 1000) / (0.785 * Dp * Dp * sleeveLen) * 100;
  const Vss = 0.579 * ((100 - fillRatio) / 100) * Math.sqrt(Dp / 1000);
  const S2 = (castVol * 1000) / (0.785 * Dp * Dp);
  const S1 = sleeveLen - (biscuitThk + S2);
  const v2 = (Q * 100) / (0.785 * Dp * Dp * 100);
  const v2Limit = 0.8 * m.Vd;
  const ventArea = Q / 20000;
  const yieldPct = ((castWt * cav) / shotWt) * 100;
  const actualGateVel = (Q / (gateAreaTgt / 100)) / 100;
  const projCasting = projPC * cav;
  const projOverflow = projCasting * ofr;
  const projRunner = projCasting * rnr;
  const projBiscuit = ((3.14 / 4) * Dp * Dp) / 100;
  const totalProj = projCasting + projOverflow + projRunner + projBiscuit +
    sideCore * Math.tan((wedge * 3.14) / 180);
  const totalForce = ((totalProj * specP) / 1000) / (eff / 100);
  const reqIntP = (Math.pow(Dp / 10, 2) * specP) / Math.pow(m.Dn / 10, 2);
  const intTable = [500, 600, 700, 800, 900, 1000, 1200].map((p) => ({
    castP: p, intP: (Math.pow(Dp / 10, 2) * p) / Math.pow(m.Dn / 10, 2),
  }));

  // ── PQ² diagram engine ──
  const PmHi = (m.hydP * m.Dn * m.Dn) / ((Dp + 10) * (Dp + 10));
  const PmLo = (m.hydP * m.Dn * m.Dn) / ((Dp - 10) * (Dp - 10));
  const QmHi = m.Vd * (Dp + 10) * (Dp + 10) * 0.785;
  const QmLo = m.Vd * (Dp - 10) * (Dp - 10) * 0.785;
  const pGVmin = ((rho / (2 * 9.8 * 100)) * Math.pow(VgMin * 100, 2) / (Cd * Cd)) / 1000;
  const pGVmax = ((rho / (2 * 9.8 * 100)) * Math.pow(VgMax * 100, 2) / (Cd * Cd)) / 1000;
  const N = 120;
  const lines: { mpl: number[][]; mplHi: number[][]; mplLo: number[][]; dpl: number[][] } = {
    mpl: [], mplHi: [], mplLo: [], dpl: [],
  };
  const qMax = Math.max(Qm, QmHi) * 1.02;
  for (let i = 0; i <= N; i++) {
    const q = (qMax * i) / N, q2 = q * q;
    lines.mpl.push([q, Math.max(Pm * (1 - q2 / (Qm * Qm)), 0)]);
    lines.mplHi.push([q, Math.max((PmHi / (QmHi * QmHi)) * (QmHi * QmHi - q2), 0)]);
    lines.mplLo.push([q, q2 <= QmLo * QmLo ? (PmLo / (QmLo * QmLo)) * (QmLo * QmLo - q2) : 0]);
    lines.dpl.push([q, Math.min((metalP / (Q * Q)) * q2, Pm)]);
  }
  return {
    m, biscuitWt, shotWt, sleeveLen, Pm, Qm, tFillTheo, QTheo, Q, metalP, accP,
    gateAreaTheo, gateAreaTgt, gateWidth, runnerArea, fillRatio, Vss, S1, S2,
    v2, v2Limit, ventArea, yieldPct, actualGateVel, projCasting, projOverflow,
    projRunner, projBiscuit, totalProj, totalForce, reqIntP, intTable,
    castVol, chart: { lines, qMax, pMax: Math.max(Pm, PmLo, pGVmax) * 1.05, pGVmin, pGVmax, Q, metalP },
  };
}

// ═══════════ PQ² DIAGRAM (SVG) ═══════════
function PQ2Chart({ chart }: { chart: ReturnType<typeof computePQ2>["chart"] }) {
  const W = 640, H = 380, L = 58, B = 40, T = 16, R = 14;
  const x = (q: number) => L + (q / chart.qMax) * (W - L - R);
  const y = (p: number) => H - B - (p / chart.pMax) * (H - B - T);
  const path = (pts: number[][]) =>
    pts.map(([q, p], i) => `${i ? "L" : "M"}${x(q).toFixed(1)},${y(Math.min(p, chart.pMax)).toFixed(1)}`).join(" ");
  const xticks = 5, yticks = 5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#101216", borderRadius: 8 }}>
      {[...Array(xticks + 1)].map((_, i) => {
        const q = (chart.qMax * i) / xticks;
        return (
          <g key={"x" + i}>
            <line x1={x(q)} y1={T} x2={x(q)} y2={H - B} stroke="#23262c" />
            <text x={x(q)} y={H - B + 16} fill="#7d838e" fontSize="10" textAnchor="middle">{fmt(q, 0)}</text>
          </g>
        );
      })}
      {[...Array(yticks + 1)].map((_, i) => {
        const p = (chart.pMax * i) / yticks;
        return (
          <g key={"y" + i}>
            <line x1={L} y1={y(p)} x2={W - R} y2={y(p)} stroke="#23262c" />
            <text x={L - 6} y={y(p) + 3} fill="#7d838e" fontSize="10" textAnchor="end">{fmt(p, 0)}</text>
          </g>
        );
      })}
      <text x={(W + L) / 2} y={H - 6} fill="#9aa0ab" fontSize="11" textAnchor="middle">Flow rate Q (cc/sec)</text>
      <text x={14} y={(H - B) / 2} fill="#9aa0ab" fontSize="11" textAnchor="middle" transform={`rotate(-90 14 ${(H - B) / 2})`}>Metal pressure (kgf/cm²)</text>
      <path d={path(chart.lines.mplHi)} fill="none" stroke="#4a90d9" strokeWidth="1.4" strokeDasharray="5 4" />
      <path d={path(chart.lines.mplLo)} fill="none" stroke="#4a90d9" strokeWidth="1.4" strokeDasharray="2 3" />
      <path d={path(chart.lines.mpl)} fill="none" stroke="#4a90d9" strokeWidth="2.4" />
      <path d={path(chart.lines.dpl)} fill="none" stroke="#ff7a1a" strokeWidth="2.4" />
      <line x1={L} y1={y(chart.pGVmin)} x2={W - R} y2={y(chart.pGVmin)} stroke="#2ecc71" strokeWidth="1.4" strokeDasharray="6 4" />
      <line x1={L} y1={y(chart.pGVmax)} x2={W - R} y2={y(Math.min(chart.pGVmax, chart.pMax))} stroke="#e05252" strokeWidth="1.4" strokeDasharray="6 4" />
      <line x1={x(chart.Q)} y1={T} x2={x(chart.Q)} y2={H - B} stroke="#ffd23f" strokeWidth="1.4" strokeDasharray="4 4" />
      <circle cx={x(chart.Q)} cy={y(chart.metalP)} r="6" fill="#ffd23f" stroke="#15171b" strokeWidth="2" />
      <g fontSize="10">
        <text x={W - R - 4} y={T + 12} fill="#4a90d9" textAnchor="end">— Machine power line (±10 mm Dp dashed)</text>
        <text x={W - R - 4} y={T + 26} fill="#ff7a1a" textAnchor="end">— Die performance line</text>
        <text x={W - R - 4} y={T + 40} fill="#2ecc71" textAnchor="end">- - Min gate velocity</text>
        <text x={W - R - 4} y={T + 54} fill="#e05252" textAnchor="end">- - Max gate velocity</text>
        <text x={W - R - 4} y={T + 68} fill="#ffd23f" textAnchor="end">● Operating point (Q, P)</text>
      </g>
    </svg>
  );
}

// ═══════════ SHARED UI ═══════════
const st: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#15171b", color: "#e8e6e1", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "24px 18px 60px", maxWidth: 1180, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 14 },
  eyebrow: { fontSize: 11, letterSpacing: "0.22em", color: "#ff7a1a", fontWeight: 700, marginBottom: 6 },
  h1: { margin: 0, fontSize: 28, fontWeight: 800 },
  statusPill: { border: "1px solid", borderRadius: 999, padding: "8px 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" },
  tabs: { display: "flex", gap: 8, margin: "16px 0 22px", flexWrap: "wrap" },
  partBar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, background: "#1d2026", border: "1px solid #2b2f37", borderRadius: 10, padding: 14, marginBottom: 22 },
  grid: { display: "grid", gridTemplateColumns: "minmax(300px, 420px) 1fr", gap: 26, alignItems: "start" },
  colTitle: { fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9aa0ab", borderBottom: "2px solid #ff7a1a", paddingBottom: 8, margin: "0 0 14px" },
  sec: { background: "#1d2026", border: "1px solid #2b2f37", borderRadius: 10, padding: "14px 16px", marginBottom: 16 },
  secTitle: { margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#ffb066", letterSpacing: "0.04em" },
  field: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "5px 0" },
  fieldLabel: { fontSize: 12.5, color: "#b9bec8", flex: 1 },
  input: { background: "#101216", border: "1px solid #343943", borderRadius: 6, color: "#fff", padding: "6px 8px", width: 110, fontSize: 13, fontVariantNumeric: "tabular-nums" },
  unit: { fontSize: 11, color: "#7d838e", width: 46 },
  machineSpecs: { display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11.5, color: "#9aa0ab", background: "#14161a", borderRadius: 6, padding: "8px 10px", margin: "6px 0 4px" },
  out: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px dashed #2b2f37" },
  outHi: { background: "linear-gradient(90deg, rgba(255,122,26,0.10), transparent)", borderRadius: 4, paddingLeft: 6, paddingRight: 6 },
  outLabel: { fontSize: 12.5, color: "#b9bec8" },
  outVal: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#fff" },
  outUnit: { fontSize: 11, fontWeight: 400, color: "#8a909b" },
  check: { display: "grid", gridTemplateColumns: "10px 1fr auto", gap: "2px 10px", alignItems: "center", padding: "7px 0", borderBottom: "1px dashed #2b2f37" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 12.5 },
  th: { textAlign: "left", color: "#9aa0ab", fontWeight: 600, borderBottom: "1px solid #343943", padding: "6px 6px" },
  td: { padding: "6px 6px", borderBottom: "1px solid #23262c", fontVariantNumeric: "tabular-nums" },
  btn: { background: "#ff7a1a", color: "#15171b", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnGhost: { background: "transparent", color: "#b9bec8", border: "1px solid #343943", borderRadius: 7, padding: "7px 14px", fontSize: 12.5, cursor: "pointer" },
  btnDanger: { background: "transparent", color: "#ff8c7a", border: "1px solid #5a2c24", borderRadius: 7, padding: "7px 14px", fontSize: 12.5, cursor: "pointer" },
  docH: { color: "#ffb066", fontSize: 16, fontWeight: 700, margin: "26px 0 8px" },
  docP: { fontSize: 13.5, lineHeight: 1.75, color: "#c9cdd5", margin: "8px 0" },
  formula: { display: "block", background: "#101216", border: "1px solid #2b2f37", borderRadius: 6, padding: "8px 12px", fontFamily: "Consolas, monospace", fontSize: 12.5, color: "#ffd9b3", margin: "8px 0", overflowX: "auto" },
  faqQ: { color: "#fff", fontSize: 14, fontWeight: 700, margin: "20px 0 6px" },
  footer: { marginTop: 28, fontSize: 11.5, color: "#6e7480", textAlign: "center" },
  footerCredit: { marginTop: 6, fontSize: 11, color: "#555a63", textAlign: "center" },
};

const tabStyle = (on: boolean): React.CSSProperties => ({
  background: on ? "#ff7a1a" : "#1d2026",
  color: on ? "#15171b" : "#b9bec8",
  border: "1px solid " + (on ? "#ff7a1a" : "#2b2f37"),
  borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
});

const Out = ({ label, val, unit, hi }: { label: string; val: string; unit: string; hi?: boolean }) => (
  <div style={{ ...st.out, ...(hi ? st.outHi : {}) }}>
    <span style={st.outLabel}>{label}</span>
    <span style={st.outVal}>{val}<span style={st.outUnit}> {unit}</span></span>
  </div>
);
const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={st.sec}><h3 style={st.secTitle}>{title}</h3>{children}</section>
);

// ═══════════ MAIN APP ═══════════
export default function PQ2App() {
  const [tab, setTab] = useState("calc");
  const [inp, setInp] = useState(DEFAULTS);
  const [machines, setMachines] = useState(DEFAULT_MACHINES);
  const [showMgr, setShowMgr] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", hydP: "", Dn: "", Vd: "", pen: "", stroke: "" });
  const [storageOk, setStorageOk] = useState(false);

  // Load saved machine database from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pq2-machine-db");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) setMachines(list);
      }
    } catch { /* no saved data or parse error — use defaults */ }
    setStorageOk(true);
  }, []);

  const persist = (list: Machine[]) => {
    setMachines(list);
    try { localStorage.setItem("pq2-machine-db", JSON.stringify(list)); } catch { /* no-op */ }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInp((p) => ({ ...p, [key]: e.target.value }));
  const num = (key: string) => { const v = parseFloat((inp as Record<string, string>)[key]); return isNaN(v) ? 0 : v; };
  const c = useMemo(() => computePQ2(inp, machines), [inp, machines]);

  const machineTonnageMatch = c.m.name.match(/\d+/);
  const machineTonnage = machineTonnageMatch ? parseFloat(machineTonnageMatch[0]) : 99999;

  const checks = [
    { label: "Static metal pressure Pm", ok: c.Pm > 300, rule: "> 300 kgf/cm²", val: `${fmt(c.Pm)} kgf/cm²` },
    { label: "Targeted fill time", ok: num("tFillTarget") < 0.045, rule: "< 0.045 s", val: `${inp.tFillTarget} s` },
    { label: "Fill ratio Fi", ok: c.fillRatio >= 25 && c.fillRatio <= 45, rule: "25 – 45 %", val: `${fmt(c.fillRatio, 1)} %` },
    { label: "Plunger velocity v2", ok: c.v2 < c.v2Limit, rule: `< 0.8·Vd = ${fmt(c.v2Limit)} m/s`, val: `${fmt(c.v2, 2)} m/s` },
    { label: "Gate velocity", ok: c.actualGateVel >= num("VgMin") && c.actualGateVel <= num("VgMax"), rule: `${inp.VgMin} – ${inp.VgMax} m/s`, val: `${fmt(c.actualGateVel, 1)} m/s` },
    { label: "Operating point inside machine line", ok: c.metalP <= c.Pm * (1 - (c.Q * c.Q) / (c.Qm * c.Qm)), rule: "P,Q under MPL", val: c.metalP <= c.Pm * (1 - (c.Q * c.Q) / (c.Qm * c.Qm)) ? "inside" : "outside" },
    { label: "Machine tonnage", ok: c.totalForce <= machineTonnage, rule: `≤ ${machineTonnage} T`, val: `${fmt(c.totalForce, 1)} T` },
  ];
  const allOk = checks.every((x) => x.ok);

  const Field = ({ label, k, unit }: { label: string; k: string; unit?: string }) => (
    <label style={st.field}>
      <span style={st.fieldLabel}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" step="any" value={(inp as Record<string, string>)[k]} onChange={set(k)} style={st.input} />
        {unit && <span style={st.unit}>{unit}</span>}
      </span>
    </label>
  );

  // ── machine manager handlers ──
  const startAdd = () => { setEditIdx(-1); setDraft({ name: "", hydP: "", Dn: "", Vd: "", pen: "", stroke: "" }); };
  const startEdit = (i: number) => { setEditIdx(i); const m = machines[i]; setDraft({ name: m.name, hydP: String(m.hydP), Dn: String(m.Dn), Vd: String(m.Vd), pen: String(m.pen), stroke: String(m.stroke) }); };
  const saveDraft = () => {
    const mNew: Machine = {
      name: String(draft.name).trim() || "UNNAMED",
      hydP: parseFloat(draft.hydP) || 0,
      Dn: parseFloat(draft.Dn) || 1,
      Vd: parseFloat(draft.Vd) || 0,
      pen: parseFloat(draft.pen) || 0,
      stroke: parseFloat(draft.stroke) || 0,
    };
    const list = [...machines];
    if (editIdx === -1) list.push(mNew);
    else if (editIdx !== null) list[editIdx] = mNew;
    persist(list);
    setEditIdx(null);
    if (editIdx !== null && editIdx >= 0 && machines[editIdx].name === inp.machine) {
      setInp((p) => ({ ...p, machine: mNew.name }));
    }
  };
  const removeMachine = (i: number) => {
    const list = machines.filter((_, j) => j !== i);
    persist(list);
    if (machines[i].name === inp.machine && list.length) {
      setInp((p) => ({ ...p, machine: list[0].name }));
    }
  };

  // ════ PAGE: CALCULATOR ════
  const CalcPage = (
    <>
      <div style={st.partBar}>
        {([["Part number", "partNumber"], ["Part name", "partName"], ["Customer", "customer"]] as [string, string][]).map(([l, k]) => (
          <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={st.fieldLabel}>{l}</span>
            <input value={(inp as Record<string, string>)[k]} onChange={set(k)} style={{ ...st.input, width: "100%" }} placeholder="—" />
          </label>
        ))}
      </div>

      <div className="pq2-grid" style={st.grid}>
        {/* INPUTS */}
        <div>
          <h2 style={st.colTitle}>Input variables</h2>
          <Sec title="Machine">
            <label style={st.field}>
              <span style={st.fieldLabel}>Machine</span>
              <select value={inp.machine} onChange={set("machine")} style={{ ...st.input, width: 180 }}>
                {machines.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </label>
            <div style={st.machineSpecs}>
              <span>Hyd. pressure <b>{c.m.hydP}</b> kgf/cm²</span>
              <span>Cylinder Ø Dn <b>{c.m.Dn}</b> mm</span>
              <span>Dry shot Vd <b>{c.m.Vd}</b> m/s</span>
              <span>Penetration <b>{c.m.pen}</b> mm</span>
              <span>Stroke <b>{c.m.stroke}</b> mm</span>
            </div>
            <button style={{ ...st.btnGhost, marginTop: 6 }} onClick={() => setShowMgr((v) => !v)}>
              {showMgr ? "Close machine manager" : "⚙ Create / edit machines"}
            </button>
            {showMgr && (
              <div style={{ marginTop: 10, borderTop: "1px solid #2b2f37", paddingTop: 10 }}>
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {machines.map((m, i) => (
                    <div key={m.name + i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px dashed #23262c", fontSize: 12.5 }}>
                      <span style={{ color: "#d6d9df" }}>{m.name}</span>
                      <span style={{ display: "flex", gap: 6 }}>
                        <button style={{ ...st.btnGhost, padding: "3px 10px" }} onClick={() => startEdit(i)}>Edit</button>
                        <button style={{ ...st.btnDanger, padding: "3px 10px" }} onClick={() => removeMachine(i)}>Delete</button>
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button style={st.btn} onClick={startAdd}>+ Add machine</button>
                  <button style={st.btnGhost} onClick={() => persist(DEFAULT_MACHINES)}>Reset to default database</button>
                </div>
                {editIdx !== null && (
                  <div style={{ marginTop: 12, background: "#14161a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#ffb066", marginBottom: 8 }}>
                      {editIdx === -1 ? "New machine" : `Editing: ${machines[editIdx].name}`}
                    </div>
                    {([
                      ["Machine name", "name", "e.g. 800 TOSHIBA", "text"],
                      ["Hydraulic pressure", "hydP", "kgf/cm²", "number"],
                      ["Hydraulic cylinder Ø Dn", "Dn", "mm", "number"],
                      ["Dry shot velocity Vd", "Vd", "m/s", "number"],
                      ["Plunger penetration", "pen", "mm", "number"],
                      ["Injection stroke", "stroke", "mm", "number"],
                    ] as [string, string, string, string][]).map(([l, k, u, t]) => (
                      <label key={k} style={st.field}>
                        <span style={st.fieldLabel}>{l}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type={t} step="any" value={(draft as Record<string, string>)[k]} placeholder={t === "text" ? u : ""}
                            onChange={(e) => setDraft((p) => ({ ...p, [k]: e.target.value }))} style={st.input} />
                          {t !== "text" && <span style={st.unit}>{u}</span>}
                        </span>
                      </label>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button style={st.btn} onClick={saveDraft}>Save machine</button>
                      <button style={st.btnGhost} onClick={() => setEditIdx(null)}>Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#7d838e", marginTop: 8 }}>
                  {storageOk ? "Machine database is saved on this device and restored next session." : "Loading saved database…"}
                </div>
              </div>
            )}
            <Field label="Plunger diameter, Dp" k="Dp" unit="mm" />
          </Sec>

          <Sec title="Casting">
            <Field label="Casting wall thickness" k="wallThk" unit="mm" />
            <Field label="Casting weight (per cavity)" k="castWt" unit="g" />
            <Field label="Weight of overflow (per cavity)" k="overflowWt" unit="g" />
            <Field label="Weight of runner" k="runnerWt" unit="g" />
            <Field label="Biscuit thickness" k="biscuitThk" unit="mm" />
            <Field label="Number of cavities" k="cavities" />
            <label style={st.field}>
              <span style={st.fieldLabel}>Alloy</span>
              <select value={inp.alloy} onChange={set("alloy")} style={{ ...st.input, width: 180 }}>
                {ALLOYS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <Field label="Density" k="density" unit="g/cc" />
          </Sec>

          <Sec title="Die & gating">
            <Field label="Fix side housing" k="fixHousing" unit="mm" />
            <Field label="Diffuser projection" k="diffuser" unit="mm" />
            <Field label="Target gate velocity" k="Vg" unit="m/s" />
            <Field label="Min. gate velocity" k="VgMin" unit="m/s" />
            <Field label="Max. gate velocity" k="VgMax" unit="m/s" />
            <Field label="Runner ratio (× gate area)" k="runnerRatio" unit="×" />
            <Field label="Targeted fill time" k="tFillTarget" unit="s" />
            <Field label="Gate depth" k="gateDepth" unit="mm" />
          </Sec>

          <Sec title="Constants & assumptions">
            <Field label="Empirical constant, k" k="k" unit="s/cm" />
            <Field label="Metal temp entering die, Ti" k="Ti" unit="°C" />
            <Field label="Min. flow temp, Tf" k="Tf" unit="°C" />
            <Field label="Die surface temp, Td" k="Td" unit="°C" />
            <Field label="Solid fraction at end of fill, S" k="S" unit="%" />
            <Field label="Conversion factor, Z" k="Z" unit="°C" />
            <Field label="Coefficient of discharge, Cd" k="Cd" />
          </Sec>

          <Sec title="Machine tonnage selection">
            <Field label="Projected area of casting (per cavity)" k="projPerCavity" unit="cm²" />
            <Field label="Overflow area ratio" k="overflowAreaRatio" unit="× cast" />
            <Field label="Runner area ratio" k="runnerAreaRatio" unit="× cast" />
            <Field label="Specific injection pressure" k="specInjP" unit="kg/cm²" />
            <Field label="Machine efficiency" k="machEff" unit="%" />
            <Field label="Side core area" k="sideCore" unit="cm²" />
            <Field label="Wedge lock angle" k="wedgeAngle" unit="°" />
          </Sec>
        </div>

        {/* OUTPUTS */}
        <div>
          <h2 style={st.colTitle}>Output parameters</h2>
          <Sec title="Process checks">
            {checks.map((x) => (
              <div key={x.label} style={st.check}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: x.ok ? "#2ecc71" : "#ff5c33" }} />
                <span style={{ fontSize: 12.5, color: "#d6d9df" }}>{x.label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{x.val}</span>
                <span style={{ gridColumn: "2 / 4", fontSize: 11, color: "#7d838e" }}>{x.rule}</span>
              </div>
            ))}
          </Sec>

          <Sec title="PQ² diagram">
            <PQ2Chart chart={c.chart} />
            <div style={{ fontSize: 11.5, color: "#9aa0ab", marginTop: 8 }}>
              The yellow operating point must sit under the blue machine power line, on the orange die line,
              and between the green (min) and red (max) gate-velocity pressure limits.
            </div>
          </Sec>

          <Sec title="Shot weight & sleeve">
            <Out label="Cavity volume (casting + overflow)" val={fmt(c.castVol, 1)} unit="cc" />
            <Out label="Weight of biscuit" val={fmt(c.biscuitWt, 1)} unit="g" />
            <Out label="Shot weight" val={fmt(c.shotWt, 1)} unit="g" hi />
            <Out label="Effective shot sleeve length" val={fmt(c.sleeveLen, 0)} unit="mm" />
            <Out label="Yield" val={fmt(c.yieldPct, 1)} unit="%" />
          </Sec>

          <Sec title="Machine power line">
            <Out label="Static metal pressure, Pm" val={fmt(c.Pm, 1)} unit="kgf/cm²" />
            <Out label="Max (dry shot) flow rate, Qm" val={fmt(c.Qm, 0)} unit="cc/s" />
          </Sec>

          <Sec title="Fill time & fill rate">
            <Out label="Theoretical fill time" val={fmt(c.tFillTheo, 4)} unit="s" />
            <Out label="Theoretical fill rate" val={fmt(c.QTheo, 0)} unit="cc/s" />
            <Out label="Targeted fill rate, Q" val={fmt(c.Q, 0)} unit="cc/s" hi />
          </Sec>

          <Sec title="Metal pressure for target gate velocity">
            <Out label="Metal pressure" val={fmt(c.metalP, 1)} unit="kgf/cm²" />
            <Out label="Accumulator pressure" val={fmt(c.accP, 2)} unit="kgf/cm²" />
          </Sec>

          <Sec title="Gate parameters">
            <Out label="Gate area (theoretical)" val={fmt(c.gateAreaTheo, 1)} unit="mm²" />
            <Out label="Targeted gate area" val={fmt(c.gateAreaTgt, 1)} unit="mm²" hi />
            <Out label="Gate width (at chosen depth)" val={fmt(c.gateWidth, 1)} unit="mm" />
            <Out label="Runner area (ratio × gate)" val={fmt(c.runnerArea, 1)} unit="mm²" />
            <Out label="Actual gate velocity" val={fmt(c.actualGateVel, 1)} unit="m/s" />
          </Sec>

          <Sec title="Shot model">
            <Out label="Fill ratio, Fi" val={fmt(c.fillRatio, 1)} unit="%" />
            <Out label="Critical slow shot velocity, Vss (V1)" val={fmt(c.Vss, 3)} unit="m/s" />
            <Out label="Start of fast shot distance, S1" val={fmt(c.S1, 1)} unit="mm" hi />
            <Out label="Fast shot stroke length, S2" val={fmt(c.S2, 1)} unit="mm" hi />
            <Out label="Plunger velocity, v2" val={fmt(c.v2, 2)} unit="m/s" hi />
            <Out label="Vent area" val={fmt(c.ventArea, 3)} unit="cm²" />
          </Sec>

          <Sec title="Machine tonnage">
            <Out label="Projected area — casting" val={fmt(c.projCasting, 1)} unit="cm²" />
            <Out label="Projected area — overflows" val={fmt(c.projOverflow, 1)} unit="cm²" />
            <Out label="Projected area — runners" val={fmt(c.projRunner, 1)} unit="cm²" />
            <Out label="Projected area — biscuit" val={fmt(c.projBiscuit, 1)} unit="cm²" />
            <Out label="Total projected area" val={fmt(c.totalProj, 1)} unit="cm²" />
            <Out label="Total force required (locking force)" val={fmt(c.totalForce, 1)} unit="TON" hi />
            <Out label="Required intensification pressure" val={fmt(c.reqIntP, 1)} unit="kg/cm²" hi />
            <table style={st.table}>
              <thead><tr><th style={st.th}>Cast pressure (kg/cm²)</th><th style={st.th}>Intensification pressure (kg/cm²)</th></tr></thead>
              <tbody>
                {c.intTable.map((r) => (
                  <tr key={r.castP} style={r.castP === num("specInjP") ? { background: "rgba(255,122,26,0.12)" } : undefined}>
                    <td style={st.td}>{r.castP}</td><td style={st.td}>{fmt(r.intP, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Sec>

          <Sec title="Parameter sheet (for shop floor)">
            <table style={st.table}>
              <thead><tr><th style={st.th}>#</th><th style={st.th}>Parameter</th><th style={st.th}>Units</th><th style={st.th}>Design value</th></tr></thead>
              <tbody>
                {[
                  ["Machine", "-", c.m.name],
                  ["Hydraulic pressure", "kgf/cm²", c.m.hydP],
                  ["Plunger diameter (Dp)", "mm", inp.Dp],
                  ["Casting wall thickness", "mm", inp.wallThk],
                  ["Casting weight", "g", inp.castWt],
                  ["Weight of overflow", "g", inp.overflowWt],
                  ["Weight of runner", "g", inp.runnerWt],
                  ["Weight of biscuit", "g", fmt(c.biscuitWt, 1)],
                  ["Biscuit thickness", "mm", inp.biscuitThk],
                  ["Alloy", "-", inp.alloy],
                  ["Shot weight", "g", fmt(c.shotWt, 1)],
                  ["Effective shot sleeve length", "mm", fmt(c.sleeveLen, 0)],
                  ["Metal temperature at holding furnace", "°C", inp.Ti],
                  ["Accumulator pressure", "kgf/cm²", fmt(c.accP, 2)],
                  ["Targeted gate area", "mm²", fmt(c.gateAreaTgt, 1)],
                  ["Start of fast shot distance (S1)", "mm", fmt(c.S1, 1)],
                  ["Fast shot stroke length (S2)", "mm", fmt(c.S2, 1)],
                  ["Plunger velocity (v2)", "m/s", fmt(c.v2, 2)],
                  ["Specific injection pressure", "kg/cm²", inp.specInjP],
                  ["Total projected area", "cm²", fmt(c.totalProj, 1)],
                  ["Total force required", "TON", fmt(c.totalForce, 1)],
                  ["Actual gate velocity", "m/s", fmt(c.actualGateVel, 1)],
                  ["Vent area", "cm²", fmt(c.ventArea, 3)],
                  ["Required intensification pressure", "kg/cm²", fmt(c.reqIntP, 1)],
                ].map((r, i) => (
                  <tr key={i}><td style={st.td}>{i + 1}</td><td style={st.td}>{r[0]}</td><td style={st.td}>{r[1]}</td><td style={{ ...st.td, fontWeight: 600 }}>{r[2]}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: "#7d838e", marginTop: 8 }}>
              Same layout as the workbook&apos;s &quot;Parameter Sheet&quot;. Actual machine-trial values (solidification time, spray time, water flow rates) are recorded at the press.
            </div>
          </Sec>
        </div>
      </div>
    </>
  );

  // ════ PAGE: DOCUMENTATION ════
  const F = ({ children }: { children: React.ReactNode }) => <code style={st.formula}>{children}</code>;
  const DocPage = (
    <div style={{ maxWidth: 820 }}>
      <h2 style={st.colTitle}>Documentation — how every number is calculated</h2>
      <p style={st.docP}>
        This application reproduces the PQ² (pressure – flow-rate-squared) process design calculation used for
        high-pressure die casting (HPDC). You enter the machine, the casting geometry and the gating targets;
        the app computes the shot weight, fill rate, gate sizing, the two-phase shot profile (S1, S2, v2),
        venting, yield, locking force and intensification pressure — and plots the PQ² diagram to confirm the
        chosen machine can actually deliver the required metal pressure at the required flow rate.
      </p>

      <h3 style={st.docH}>1 · Machine database</h3>
      <p style={st.docP}>
        Each machine stores five characteristics: hydraulic pressure (P<sub>h</sub>), injection cylinder diameter
        (D<sub>n</sub>), dry shot velocity (V<sub>d</sub>), plunger penetration, and injection stroke. Two derived
        values define the machine&apos;s capability envelope:
      </p>
      <F>Static metal pressure  Pm = Ph · Dn² / Dp²   [kgf/cm²]   — must exceed 300</F>
      <F>Max flow rate  Qm = Vd · (π/4) · Dp²   [cc/s]</F>
      <p style={st.docP}>
        Pm is the maximum pressure the machine can put on the metal through the chosen plunger; Qm is the most
        metal it can move per second. A bigger plunger lowers Pm but raises Qm — that trade-off is the whole
        point of the PQ² diagram.
      </p>

      <h3 style={st.docH}>2 · Shot weight and sleeve</h3>
      <F>Biscuit weight = (π/4 · Dp² · biscuit thickness / 1000) · density</F>
      <F>Shot weight = (casting + overflow) · cavities + runner + biscuit</F>
      <F>Effective sleeve length = (stroke − penetration) + (fix-side housing − diffuser projection)</F>
      <F>Yield % = casting weight · cavities / shot weight · 100</F>

      <h3 style={st.docH}>3 · Fill time and fill rate</h3>
      <p style={st.docP}>The theoretical maximum fill time comes from the NADCA thermal equation:</p>
      <F>t = k · ( (Ti − Tf + S·Z) / (Tf − Td) ) · T(wall)</F>
      <p style={st.docP}>
        where k is an empirical alloy constant (0.0346 s/cm for aluminium), Ti the melt temperature entering the
        die, Tf the minimum flow temperature, Td the die surface temperature, S the allowable solid fraction (%)
        and Z a units conversion factor. You then choose a <b>targeted fill time</b> at or below this limit, and:
      </p>
      <F>Cavity volume = (casting + overflow) · cavities / density   [cc]</F>
      <F>Targeted fill rate  Q = cavity volume / targeted fill time   [cc/s]</F>

      <h3 style={st.docH}>4 · Metal pressure and gate sizing</h3>
      <F>Metal pressure P = (ρ·0.001/1962) · (Vg·100 / Cd)²   [kgf/cm²]</F>
      <F>Accumulator pressure = P / (Dn²/Dp²)</F>
      <F>Targeted gate area = Q / Vg   [mm²]      Gate width = gate area / gate depth</F>
      <F>Runner area = runner ratio × gate area   (typically 1.5×)</F>
      <p style={st.docP}>
        Vg is the target gate velocity (25–40 m/s for aluminium, 30 m/s typical) and Cd the discharge coefficient
        of the gating system (≈0.3 here, accounting for friction losses).
      </p>

      <h3 style={st.docH}>5 · Shot model — S1, S2, V1, v2</h3>
      <F>Fill ratio Fi = (shot volume) / (0.785 · Dp² · sleeve length) · 100   — keep 25–45 %</F>
      <F>Critical slow shot velocity Vss = 0.579 · (1 − Fi/100) · √(Dp/1000)   [m/s]   (Garber)</F>
      <F>S2 (fast shot stroke) = cavity volume · 1000 / (0.785 · Dp²)   [mm]</F>
      <F>S1 (slow shot end) = sleeve length − (biscuit thickness + S2)   [mm]</F>
      <F>Plunger fast-shot velocity v2 = Q / (0.785 · Dp²)   — must stay below 0.8·Vd</F>
      <p style={st.docP}>
        The slow phase (V1 = Vss) pushes the wave of metal up the sleeve without entrapping air; the fast phase
        (v2 over distance S2) fills the cavity within the targeted fill time.
      </p>

      <h3 style={st.docH}>6 · Venting</h3>
      <F>Vent area = Q / 20000   [cm²]</F>

      <h3 style={st.docH}>7 · Machine tonnage and intensification</h3>
      <F>Total projected area = casting + overflows + runners + biscuit + side core · tan(wedge angle)</F>
      <F>Locking force = total projected area · specific injection pressure / 1000 / efficiency   [TON]</F>
      <F>Required intensification pressure = (Dp/10)² · specific injection pressure / (Dn/10)²</F>
      <p style={st.docP}>
        The locking force must be below the machine&apos;s rated tonnage or the die will flash. The intensification
        table shows the hydraulic intensification setting needed to reach each cast pressure with the chosen
        plunger/cylinder combination.
      </p>

      <h3 style={st.docH}>8 · The PQ² diagram</h3>
      <p style={st.docP}>
        The diagram plots metal pressure against flow rate with the X-axis proportional to Q². On these axes the
        <b> machine power line</b> (from Pm at Q=0 down to Qm at P=0) is straight. The <b>die performance line</b> is
        P = P(target) · Q²/Q(target)² — a straight line through the origin in Q² space. Their intersection is the
        natural operating point. The dashed blue lines show the machine line with the plunger 10 mm larger and
        10 mm smaller, so you can see immediately whether a plunger change would help. The green and red dashed
        horizontals are the pressures corresponding to the minimum and maximum allowed gate velocities — the
        operating point must land between them, below the machine line.
      </p>

      <h3 style={st.docH}>Source</h3>
      <p style={st.docP}>
        All formulas were extracted 1:1 from the original workbook (sheet &quot;PQ2&quot;, including its hidden graph
        engine in columns AC–AU, the machine database in columns AB–AG, and the &quot;Parameter Sheet&quot; report). One
        generalisation was made: the workbook hardcoded the projected area of this particular casting
        (45.41 cm² per cavity); the app exposes it as an input so any part can be designed.
      </p>
    </div>
  );

  // ════ PAGE: FAQ ════
  const faqs: [string, string][] = [
    ["What does this app calculate?", "It performs the complete PQ² process design for a high-pressure die casting part: shot weight, fill time/rate, gate and runner sizing, the two-phase shot profile (S1, S2, V1, v2), vent area, yield, locking force, intensification pressure, and the PQ² machine-vs-die diagram."],
    ["Which inputs do I need before starting?", "From the part: casting weight per cavity, overflow weight, runner weight, wall thickness, projected area per cavity, and number of cavities. From the die: biscuit thickness, fix-side housing, diffuser projection, gate depth. From the process: target gate velocity (start at 30 m/s), targeted fill time (≤ the theoretical fill time shown), and specific injection pressure (700–900 kg/cm² typical for structural aluminium parts)."],
    ["Where do casting / overflow / runner weights come from?", "From CAD volume × alloy density at the design stage, or from actual weighed samples once a die exists. Enter weights per cavity for casting and overflow; runner weight is the total for the layout."],
    ["How do I pick the plunger diameter?", "Choose a Dp that keeps the fill ratio between 25 % and 45 % and the static metal pressure Pm above 300 kgf/cm². The PQ² chart shows dashed lines for Dp ± 10 mm so you can see whether a size change moves the operating point in the right direction."],
    ["What is the targeted fill time and how do I choose it?", "It's the time you intend the cavity to fill in. It must not exceed the theoretical fill time computed from the thermal equation (shown right above it). Thin-walled parts need shorter times. The sheet's rule of thumb flags anything above 0.045 s."],
    ["What do the pass/fail checks mean?", "Green means the value is inside the accepted process window taken from the original sheet: Pm > 300 kgf/cm², fill time < 0.045 s, fill ratio 25–45 %, v2 < 0.8 × dry shot velocity, actual gate velocity between your min/max, operating point under the machine power line, and locking force below the machine's rated tonnage. Any red item means change an input — usually plunger diameter, fill time, gate velocity, or the machine itself."],
    ["How do I add a new machine?", "On the Calculator page, open \"⚙ Create / edit machines\", press \"+ Add machine\", and enter five values from the machine's datasheet: hydraulic pressure, injection cylinder diameter, dry shot velocity, plunger penetration, and injection stroke. Save — it immediately appears in the dropdown and is stored on your device for future sessions."],
    ["Can I edit or delete the built-in machines?", "Yes — every machine can be edited or deleted. \"Reset to default database\" restores the original 20-machine list from the workbook at any time."],
    ["Why is the projected area an input when the spreadsheet calculated it?", "The original workbook hardcoded 45.41 cm² because it was built for one specific part (the water pump cover). The app exposes it as an input so the same calculator works for any casting. Overflow and runner projected areas default to 40 % and 60 % of the casting area, as in the sheet, but the ratios are editable too."],
    ["What is the PQ² diagram telling me?", "Blue line = what the machine can deliver (high pressure at low flow, less at high flow). Orange line = what the die demands. Their crossing is where the process will actually run. The yellow dot is your designed operating point — it must sit on the die line, under the machine line, and between the green (min gate velocity) and red (max gate velocity) limits."],
    ["What are S1, S2 and v2 used for on the shop floor?", "They are the shot-end settings of the machine: S1 is where the changeover from slow to fast shot happens (mm of plunger travel), S2 is the fast-shot stroke, and v2 is the fast-shot plunger speed. V1 (Vss) is the slow-shot speed that avoids air entrapment in the sleeve."],
    ["Does the app save my work?", "The machine database is saved automatically on your device. Part inputs reset when you reload — note down or screenshot the Parameter Sheet table, which is formatted for shop-floor use."],
    ["The units look mixed — kgf/cm², TON, cc/s. Why?", "They match the original engineering sheet exactly so results are directly comparable with existing records: pressures in kgf/cm², forces in metric tons, flow in cc/s, lengths in mm, areas in mm² or cm² as labelled on each row."],
  ];
  const FaqPage = (
    <div style={{ maxWidth: 820 }}>
      <h2 style={st.colTitle}>FAQ — using the app</h2>
      {faqs.map(([q, a]) => (
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
        @media (max-width: 880px){ .pq2-grid{ grid-template-columns: 1fr !important; } }
      `}</style>

      <header style={st.header}>
        <div>
          <div style={st.eyebrow}>HPDC PROCESS DESIGN · PQ² CALCULATION</div>
          <h1 style={st.h1}>Shot &amp; Gating Studio</h1>
        </div>
        {tab === "calc" && (
          <div style={{ ...st.statusPill, background: allOk ? "#123d22" : "#46190f", borderColor: allOk ? "#2ecc71" : "#ff5c33", color: allOk ? "#7af2ae" : "#ffb09a" }}>
            {allOk ? "● ALL CHECKS PASS" : "● REVIEW REQUIRED"}
          </div>
        )}
      </header>

      <nav style={st.tabs}>
        <button style={tabStyle(tab === "calc")} onClick={() => setTab("calc")}>Calculator</button>
        <button style={tabStyle(tab === "doc")} onClick={() => setTab("doc")}>Documentation</button>
        <button style={tabStyle(tab === "faq")} onClick={() => setTab("faq")}>FAQ</button>
      </nav>

      {tab === "calc" ? CalcPage : tab === "doc" ? DocPage : FaqPage}

      <footer style={st.footer}>
        PQ² process design · formulas replicated 1:1 from the source worksheet, including the hidden PQ² graph engine
      </footer>
      <div style={st.footerCredit}>
        Design &amp; developed by <a href="https://skmudassir.in" target="_blank" rel="noopener noreferrer" style={{ color: "#7d838e", textDecoration: "underline" }}>Mudassir Shaik</a> (skmudassir.in)
      </div>
    </div>
  );
}
