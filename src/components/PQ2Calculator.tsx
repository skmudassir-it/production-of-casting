"use client";

import { useState, useMemo } from "react";

// ── Machine database (from PQ2 sheet, cols AB:AG) ──────────────────
const MACHINES = [
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

// Default inputs (from PQ_2 cover sheet — COVER WATER PUMP, AF101562)
const DEFAULTS = {
  partNumber: "AF101562",
  partName: "COVER WATER PUMP",
  customer: "",
  machine: "250 TOSHIBA CHINA",
  Dp: 50,            // plunger diameter, mm
  wallThk: 2.5,      // casting wall thickness, mm
  castWt: 157.47,    // casting weight per cavity, g
  overflowWt: 20,    // overflow weight per cavity, g
  runnerWt: 228.2,   // runner weight, g
  biscuitThk: 20,    // biscuit thickness, mm
  cavities: 2,
  alloy: "AlSi132",
  density: 2.5,      // g/cc
  fixHousing: 200,   // fix side housing, mm
  diffuser: 20,      // diffuser projection, mm
  Vg: 30,            // target gate velocity, m/s
  VgMin: 25,
  VgMax: 40,
  runnerRatio: 1.5,
  tFillTarget: 0.028, // targeted fill time, s
  gateDepth: 2,       // mm
  k: 0.0346,          // empirical constant, sec/cm
  Ti: 660,            // molten metal temp entering die, °C
  Tf: 580,            // min flow temp, °C
  Td: 180,            // die cavity surface temp, °C
  S: 15,              // % solid fraction at end of fill
  Z: 3.8,             // units conversion factor, °C
  Cd: 0.3,            // coefficient of discharge
  projPerCavity: 45.41, // projected area of casting per cavity, cm²
  overflowAreaRatio: 0.4,
  runnerAreaRatio: 0.6,
  specInjP: 800,      // specific injection pressure, kg/cm²
  machEff: 83.33,     // %
  sideCore: 20,       // cm²
  wedgeAngle: 10,     // °
};

const fmt = (v: number, d = 2): string =>
  !isFinite(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: 0 });

export default function PQ2Calculator() {
  const [inp, setInp] = useState(DEFAULTS);
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    setInp((p) => ({ ...p, [key]: raw }));
  };
  const num = (key: string) => {
    const v = parseFloat(inp[key as keyof typeof inp] as string);
    return isNaN(v) ? 0 : v;
  };

  const calc = useMemo(() => {
    const m = MACHINES.find((x) => x.name === inp.machine) || MACHINES[4];
    const Dp = num("Dp"), wallThk = num("wallThk"), castWt = num("castWt"),
          overflowWt = num("overflowWt"), runnerWt = num("runnerWt"),
          biscuitThk = num("biscuitThk"), cav = num("cavities"), rho = num("density"),
          fixH = num("fixHousing"), diff = num("diffuser"), Vg = num("Vg"),
          tFill = num("tFillTarget"), gateDepth = num("gateDepth"),
          k = num("k"), Ti = num("Ti"), Tf = num("Tf"), Td = num("Td"),
          S = num("S"), Z = num("Z"), Cd = num("Cd"),
          projPC = num("projPerCavity"), ofr = num("overflowAreaRatio"),
          rnr = num("runnerAreaRatio"), specP = num("specInjP"),
          eff = num("machEff"), sideCore = num("sideCore"), wedge = num("wedgeAngle");

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
      castP: p,
      intP: (Math.pow(Dp / 10, 2) * p) / Math.pow(m.Dn / 10, 2),
    }));

    return {
      m, biscuitWt, shotWt, sleeveLen, Pm, Qm, tFillTheo, QTheo, Q, metalP, accP,
      gateAreaTheo, gateAreaTgt, gateWidth, fillRatio, Vss, S1, S2, v2, v2Limit,
      ventArea, yieldPct, actualGateVel, projCasting, projOverflow, projRunner,
      projBiscuit, totalProj, totalForce, reqIntP, intTable,
    };
  }, [inp]);

  const c = calc;
  const machineTonnage = parseInt(c.m.name.match(/\d+/)?.[0] || "9999");
  const checks = [
    { label: "Static metal pressure Pm", ok: c.Pm > 300, rule: "> 300 kgf/cm²", val: `${fmt(c.Pm)} kgf/cm²` },
    { label: "Targeted fill time", ok: num("tFillTarget") < 0.045, rule: "< 0.045 s", val: `${inp.tFillTarget} s` },
    { label: "Fill ratio Fi", ok: c.fillRatio >= 25 && c.fillRatio <= 45, rule: "25 – 45 %", val: `${fmt(c.fillRatio, 1)} %` },
    { label: "Plunger velocity v2", ok: c.v2 < c.v2Limit, rule: `< 0.8·Vd = ${fmt(c.v2Limit)} m/s`, val: `${fmt(c.v2, 2)} m/s` },
    { label: "Gate velocity", ok: c.actualGateVel >= num("VgMin") && c.actualGateVel <= num("VgMax"), rule: `${inp.VgMin} – ${inp.VgMax} m/s`, val: `${fmt(c.actualGateVel, 1)} m/s` },
    { label: "Machine tonnage", ok: c.totalForce <= machineTonnage, rule: `≤ ${machineTonnage} T (machine)`, val: `${fmt(c.totalForce, 1)} T` },
  ];
  const allOk = checks.every((x) => x.ok);

  const Field = ({ label, k, unit, step = "any" }: { label: string; k: string; unit?: string; step?: string }) => (
    <label style={st.field}>
      <span style={st.fieldLabel}>{label}</span>
      <span style={st.fieldRow}>
        <input type="number" step={step} value={inp[k as keyof typeof inp] as string} onChange={set(k)} style={st.input} />
        {unit && <span style={st.unit}>{unit}</span>}
      </span>
    </label>
  );
  const Out = ({ label, val, unit, hi }: { label: string; val: string; unit: string; hi?: boolean }) => (
    <div style={{ ...st.out, ...(hi ? st.outHi : {}) }}>
      <span style={st.outLabel}>{label}</span>
      <span style={st.outVal}>
        {val}<span style={st.outUnit}> {unit}</span>
      </span>
    </div>
  );
  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section style={st.sec}>
      <h3 style={st.secTitle}>{title}</h3>
      {children}
    </section>
  );

  return (
    <div style={st.page}>
      <style>{`
        input[type=number]{ -moz-appearance:textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
        input:focus, select:focus { outline: 2px solid #ff7a1a; outline-offset: 1px; }
        @media (max-width: 860px){ .pq2-grid{ grid-template-columns: 1fr !important; } }
      `}</style>

      <header style={st.header}>
        <div>
          <div style={st.eyebrow}>HPDC PROCESS DESIGN · PQ² CALCULATION</div>
          <h1 style={st.h1}>Shot &amp; Gating Calculator</h1>
        </div>
        <div style={{ ...st.statusPill, background: allOk ? "#123d22" : "#46190f", borderColor: allOk ? "#2ecc71" : "#ff5c33", color: allOk ? "#7af2ae" : "#ffb09a" }}>
          {allOk ? "● ALL CHECKS PASS" : "● REVIEW REQUIRED"}
        </div>
      </header>

      <div style={st.partBar}>
        <label style={st.partField}><span style={st.fieldLabel}>Part number</span>
          <input value={inp.partNumber} onChange={set("partNumber")} style={st.input} /></label>
        <label style={st.partField}><span style={st.fieldLabel}>Part name</span>
          <input value={inp.partName} onChange={set("partName")} style={st.input} /></label>
        <label style={st.partField}><span style={st.fieldLabel}>Customer</span>
          <input value={inp.customer} onChange={set("customer")} style={st.input} placeholder="—" /></label>
      </div>

      <div className="pq2-grid" style={st.grid}>
        {/* ── LEFT: INPUTS ── */}
        <div>
          <h2 style={st.colTitle}>Input variables</h2>

          <Sec title="Machine">
            <label style={st.field}>
              <span style={st.fieldLabel}>Machine</span>
              <select value={inp.machine} onChange={set("machine")} style={{ ...st.input, width: "100%" }}>
                {MACHINES.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </label>
            <div style={st.machineSpecs}>
              <span>Hyd. pressure <b>{c.m.hydP}</b> kgf/cm²</span>
              <span>Cylinder Ø Dn <b>{c.m.Dn}</b> mm</span>
              <span>Dry shot Vd <b>{c.m.Vd}</b> m/s</span>
              <span>Penetration <b>{c.m.pen}</b> mm</span>
              <span>Injection stroke <b>{c.m.stroke}</b> mm</span>
            </div>
            <Field label="Plunger diameter, Dp" k="Dp" unit="mm" />
          </Sec>

          <Sec title="Casting">
            <Field label="Casting wall thickness" k="wallThk" unit="mm" />
            <Field label="Casting weight (per cavity)" k="castWt" unit="g" />
            <Field label="Weight of overflow (per cavity)" k="overflowWt" unit="g" />
            <Field label="Weight of runner" k="runnerWt" unit="g" />
            <Field label="Biscuit thickness" k="biscuitThk" unit="mm" />
            <Field label="Number of cavities" k="cavities" step="1" />
            <label style={st.field}>
              <span style={st.fieldLabel}>Alloy</span>
              <select value={inp.alloy} onChange={set("alloy")} style={{ ...st.input, width: "100%" }}>
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
            <Field label="Overflow area ratio" k="overflowAreaRatio" unit="× casting" />
            <Field label="Runner area ratio" k="runnerAreaRatio" unit="× casting" />
            <Field label="Specific injection pressure" k="specInjP" unit="kg/cm²" />
            <Field label="Machine efficiency" k="machEff" unit="%" />
            <Field label="Side core area" k="sideCore" unit="cm²" />
            <Field label="Wedge lock angle" k="wedgeAngle" unit="°" />
          </Sec>
        </div>

        {/* ── RIGHT: OUTPUTS ── */}
        <div>
          <h2 style={st.colTitle}>Output parameters</h2>

          <Sec title="Process checks">
            {checks.map((x) => (
              <div key={x.label} style={st.check}>
                <span style={{ ...st.checkDot, background: x.ok ? "#2ecc71" : "#ff5c33" }} />
                <span style={st.checkLabel}>{x.label}</span>
                <span style={st.checkVal}>{x.val}</span>
                <span style={st.checkRule}>{x.rule}</span>
              </div>
            ))}
          </Sec>

          <Sec title="Shot weight & sleeve">
            <Out label="Weight of biscuit" val={fmt(c.biscuitWt, 1)} unit="g" />
            <Out label="Shot weight" val={fmt(c.shotWt, 1)} unit="g" hi />
            <Out label="Effective shot sleeve length" val={fmt(c.sleeveLen, 0)} unit="mm" />
            <Out label="Yield" val={fmt(c.yieldPct, 1)} unit="%" />
          </Sec>

          <Sec title="Machine power line">
            <Out label="Static metal pressure, Pm" val={fmt(c.Pm, 1)} unit="kgf/cm²" />
            <Out label="Max flow rate, Qm" val={fmt(c.Qm, 0)} unit="cc/s" />
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
            <Out label="Runner area (ratio)" val={fmt(c.gateAreaTgt * num("runnerRatio"), 1)} unit="mm²" />
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
            <Out label="Total force required" val={fmt(c.totalForce, 1)} unit="TON" hi />
            <Out label="Required intensification pressure" val={fmt(c.reqIntP, 1)} unit="kg/cm²" hi />
            <table style={st.table}>
              <thead>
                <tr><th style={st.th}>Cast pressure (kg/cm²)</th><th style={st.th}>Intensification pressure (kg/cm²)</th></tr>
              </thead>
              <tbody>
                {c.intTable.map((r) => (
                  <tr key={r.castP} style={r.castP === num("specInjP") ? st.trHi : undefined}>
                    <td style={st.td}>{r.castP}</td><td style={st.td}>{fmt(r.intP, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Sec>
        </div>
      </div>

      <footer style={st.footer}>
        PQ² process design · formulas replicated from the source worksheet · values recalculate live as inputs change
      </footer>
    </div>
  );
}

// ── styles: graphite panel + molten-aluminium accent ──
const st: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#15171b", color: "#e8e6e1", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "28px 20px 60px", maxWidth: 1180, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 18 },
  eyebrow: { fontSize: 11, letterSpacing: "0.22em", color: "#ff7a1a", fontWeight: 700, marginBottom: 6 },
  h1: { margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em" },
  statusPill: { border: "1px solid", borderRadius: 999, padding: "8px 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" },
  partBar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, background: "#1d2026", border: "1px solid #2b2f37", borderRadius: 10, padding: 14, marginBottom: 24 },
  partField: { display: "flex", flexDirection: "column", gap: 4 },
  grid: { display: "grid", gridTemplateColumns: "minmax(300px, 420px) 1fr", gap: 28, alignItems: "start" },
  colTitle: { fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9aa0ab", borderBottom: "2px solid #ff7a1a", paddingBottom: 8, margin: "0 0 14px" },
  sec: { background: "#1d2026", border: "1px solid #2b2f37", borderRadius: 10, padding: "14px 16px", marginBottom: 16 },
  secTitle: { margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#ffb066", letterSpacing: "0.04em" },
  field: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "5px 0" },
  fieldLabel: { fontSize: 12.5, color: "#b9bec8", flex: 1 },
  fieldRow: { display: "flex", alignItems: "center", gap: 6 },
  input: { background: "#101216", border: "1px solid #343943", borderRadius: 6, color: "#fff", padding: "6px 8px", width: 110, fontSize: 13, fontVariantNumeric: "tabular-nums" },
  unit: { fontSize: 11, color: "#7d838e", width: 44 },
  machineSpecs: { display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11.5, color: "#9aa0ab", background: "#14161a", borderRadius: 6, padding: "8px 10px", margin: "6px 0 4px" },
  out: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px dashed #2b2f37" },
  outHi: { background: "linear-gradient(90deg, rgba(255,122,26,0.10), transparent)", borderRadius: 4, paddingLeft: 6, paddingRight: 6 },
  outLabel: { fontSize: 12.5, color: "#b9bec8" },
  outVal: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#fff" },
  outUnit: { fontSize: 11, fontWeight: 400, color: "#8a909b" },
  check: { display: "grid", gridTemplateColumns: "10px 1fr auto", gap: "2px 10px", alignItems: "center", padding: "7px 0", borderBottom: "1px dashed #2b2f37" },
  checkDot: { width: 9, height: 9, borderRadius: 99 },
  checkLabel: { fontSize: 12.5, color: "#d6d9df" },
  checkVal: { fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" },
  checkRule: { gridColumn: "2 / 4", fontSize: 11, color: "#7d838e" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 12.5 },
  th: { textAlign: "left", color: "#9aa0ab", fontWeight: 600, borderBottom: "1px solid #343943", padding: "6px 4px" },
  td: { padding: "5px 4px", borderBottom: "1px solid #23262c", fontVariantNumeric: "tabular-nums" },
  trHi: { background: "rgba(255,122,26,0.12)" },
  footer: { marginTop: 28, fontSize: 11.5, color: "#6e7480", textAlign: "center" },
};
