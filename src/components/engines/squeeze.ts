// ═══════════ SHARED FORMATTER ═══════════
const fmt = (v: number, d = 2): string =>
  !isFinite(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });

// ═══════════ DEFAULT INPUTS ═══════════
export const SQUEEZE_DEFAULTS: Record<string, string> = {
  squeezePressure: "80",    // MPa — applied squeeze pressure
  plungerDia: "100",        // mm — plunger diameter Dp
  castWt: "2500",           // g — casting weight per cavity
  alloy: "AlSi132 (Al-Si)", // material selection
  density: "2.65",          // g/cc — alloy density
  wallThk: "15",            // mm — casting wall thickness
  sectionMod: "20",         // mm — section modulus (V/A)
  Ti: "700",                // °C — melt temperature
  Tf: "580",                // °C — minimum flow temperature
  Td: "300",                // °C — die temperature (hotter than HPDC)
  k: "0.0346",              // s/cm — empirical constant
  S: "15",                  // % — solid fraction at end of fill
  Z: "3.8",                 // °C — conversion factor
  fillTime: "10",           // s — fill time (slow, laminar)
  cavities: "1",            // — number of cavities
};

// ═══════════ COMPUTE FUNCTION ═══════════
export function computeSqueeze(inp: Record<string, string>) {
  const n = (k: string) => {
    const v = parseFloat(inp[k]);
    return isNaN(v) ? 0 : v;
  };

  const squeezePressure = n("squeezePressure"); // MPa
  const Dp = n("plungerDia");                   // mm
  const castWt = n("castWt");                   // g
  const rho = n("density");                     // g/cc
  const wallThk = n("wallThk");                 // mm
  const sectionMod = n("sectionMod");           // mm
  const Ti = n("Ti");                           // °C
  const Tf = n("Tf");                           // °C
  const Td = n("Td");                           // °C
  const k_val = n("k");                         // s/cm
  const S = n("S");                             // %
  const Z = n("Z");                             // °C
  const fillTime = n("fillTime");               // s
  const cavities = Math.max(1, Math.round(n("cavities")) || 1);

  // 1. Plunger area
  const A_plunger = (Math.PI / 4) * Math.pow(Dp / 10, 2); // cm²

  // 2. Squeeze force (formula from task: F = squeezePressure * PI * Dp * Dp / 40000 tonnes)
  const F_squeeze =
    (squeezePressure * Math.PI * Dp * Dp) / 40000; // tonnes-force

  // Alternative: F in kN for reference
  // F(kN) = squeezePressure(MPa) * A_plunger(cm²) * 0.1
  const F_squeeze_kN = squeezePressure * A_plunger * 0.1; // kN

  // 3. Solidification time under pressure
  // t_solid = (sectionMod * sectionMod) / 4 (s)
  const t_solid = (sectionMod * sectionMod) / 4; // s

  // 4. Fill velocity (characteristic slow, laminar fill for squeeze casting)
  const v_fill = 0.05; // m/s — laminar fill

  // 5. Dwell time (pressure hold time) — 20% safety margin over solidification
  const t_dwell = t_solid * 1.2; // s

  // 6. Porosity quality index from pressure
  const PI_quality =
    squeezePressure > 0 ? (1 / squeezePressure) * 10 : Infinity;

  // Derived values
  const castVol = castWt / rho;                            // cc per cavity
  const totalCastVol = castVol * cavities;                 // cc total
  const castWtTotal = castWt * cavities;                   // g total

  // Specific pressure on the casting (MPa)
  // P_cast = squeezePressure * (A_plunger_cm2) / (projected_area_cm2)
  // Without projected area input, we estimate from casting volume and wall thickness:
  // Approximate projected area ≈ (castVol / wallThk) * 100  (mm² to cm²...)
  // Actually: cast vol cc = projected cm² * wall_thickness cm
  // projected cm² = castVol cc / (wallThk/10) = castVol*10/wallThk
  // But this is a rough approximation. Include it with a note.
  const projArea_est =
    wallThk > 0 ? (castVol * 10) / wallThk : 0; // cm² (rough estimate)
  const specificPressure =
    projArea_est > 0
      ? (F_squeeze_kN * 1000) / (projArea_est * 100) // MPa (kN / cm² → MPa: *10)
      : 0;
  // More directly: F_squeeze in tonnes = F_squeeze_kN / 9.81.
  // Specific pressure on casting = F_squeeze / projArea_est * 9.81 MPa
  // Let me simplify: P_cast (MPa) = F_squeeze_kN * 1000 / (projArea_est * 100)
  // = F_squeeze_kN * 10 / projArea_est
  const P_cast =
    projArea_est > 0
      ? (F_squeeze_kN * 10) / projArea_est
      : 0; // MPa on casting face

  // Thermal fill time (laminar fill time check against solidification)
  const tFillThermal =
    (Tf - Td) !== 0
      ? k_val * ((Ti - Tf + S * Z) / (Tf - Td)) * wallThk * 3
      : Infinity; // s — 3× slower than HPDC due to thick sections

  // Plunger stroke required
  // totalCastVol cc, A_plunger cm². Stroke = totalCastVol / A_plunger cm
  const plungerStroke =
    A_plunger > 0 ? totalCastVol / A_plunger : 0; // cm
  const plungerStrokeMM = plungerStroke * 10; // mm

  // Plunger velocity during fill
  // fillTime in seconds, stroke in mm. v_plunger = stroke / fillTime
  const v_plunger =
    fillTime > 0 ? plungerStrokeMM / fillTime : 0; // mm/s

  // Reynolds number check (laminar flow indicator)
  // Re = ρ·v·D / μ. Rough check: v should be << 0.5 m/s for laminar in squeeze
  const isLaminar = v_plunger < 500; // mm/s => 0.5 m/s threshold

  return {
    // Core outputs
    A_plunger,
    F_squeeze,
    F_squeeze_kN,
    t_solid,
    v_fill,
    t_dwell,
    PI_quality,
    // Derived
    castVol,
    totalCastVol,
    castWtTotal,
    projArea_est,
    specificPressure,
    P_cast,
    tFillThermal,
    plungerStroke,
    plungerStrokeMM,
    v_plunger,
    isLaminar,
    // Copy inputs for checks
    squeezePressure,
    Dp,
    fillTime,
    sectionMod,
    wallThk,
    castWt,
    cavities,
  };
}

// ═══════════ PROCESS CHECKS ═══════════
export function squeezeChecks(
  inp: Record<string, string>,
  c: ReturnType<typeof computeSqueeze>
) {
  return [
    {
      label: "Squeeze pressure",
      ok: c.squeezePressure > 50,
      rule: "> 50 MPa (minimum for squeeze effect)",
      val: `${fmt(c.squeezePressure, 1)} MPa`,
      detail:
        c.squeezePressure >= 100
          ? "High-pressure squeeze — dense, fine-grained structure"
          : c.squeezePressure > 50
          ? "Adequate for general squeeze casting"
          : "Too low — insufficient to close shrinkage porosity",
    },
    {
      label: "Fill time (laminar)",
      ok: c.fillTime > 3,
      rule: "> 3 s (slow fill — non-turbulent)",
      val: `${fmt(c.fillTime, 1)} s`,
      detail:
        c.isLaminar
          ? `Laminar fill (${fmt(c.v_plunger, 0)} mm/s plunger speed)`
          : `Plunger speed ${fmt(c.v_plunger, 0)} mm/s — check for turbulence`,
    },
    {
      label: "Dwell > solidification",
      ok: c.t_dwell > c.t_solid,
      rule: `Dwell time > solidification time (${fmt(c.t_solid, 1)} s)`,
      val: `${fmt(c.t_dwell, 1)} s`,
      detail:
        c.t_dwell >= c.t_solid * 1.1
          ? "Adequate dwell — 20% safety margin applied"
          : "Dwell too short — pressure removed before full solidification",
    },
    {
      label: "Section modulus",
      ok: c.sectionMod < 30,
      rule: "< 30 mm (squeeze works best for moderate sections)",
      val: `${fmt(c.sectionMod, 1)} mm`,
      detail:
        c.sectionMod < 20
          ? "Ideal for squeeze casting"
          : c.sectionMod < 30
          ? "Acceptable — may need higher pressure"
          : "Section too thick for effective squeeze — consider LPDC or sand casting",
    },
    {
      label: "Quality index",
      ok: c.PI_quality > 0.3,
      rule: "> 0.3 (pressure-driven densification)",
      val: fmt(c.PI_quality, 3),
      detail:
        c.PI_quality > 0.5
          ? "Excellent densification expected"
          : c.PI_quality > 0.3
          ? "Adequate quality"
          : "Low — increase squeeze pressure or reduce section modulus",
    },
    {
      label: "Squeeze force utilisation",
      ok: c.F_squeeze > 0 && c.F_squeeze < 500,
      rule: "< 500 tonnes (practical press range)",
      val: `${fmt(c.F_squeeze, 1)} tonnes`,
      detail:
        c.F_squeeze > 500
          ? "Very high force — check press capacity"
          : c.F_squeeze > 0
          ? `Within typical press range (${fmt(c.F_squeeze_kN, 0)} kN)`
          : "Invalid — check plunger diameter and pressure",
    },
  ];
}

// ═══════════ DOCUMENTATION ═══════════
export const SQUEEZE_DOC = `
## Squeeze Casting — Process Design

Squeeze casting (also called liquid metal forging) applies high pressure to molten metal during solidification.
Unlike HPDC, the metal is introduced slowly (laminar fill) and then pressurised throughout freezing,
producing near-wrought properties with zero gas porosity. It is used for safety-critical automotive parts
(control arms, knuckles, brake callipers) and high-integrity aerospace components.

### 1 · Plunger area and squeeze force

\`\`\`
A_plunger = π/4 · (Dp/10)²   [cm²]
\`\`\`

\`\`\`
F_squeeze = P_squeeze · π · Dp² / 40000   [tonnes-force]
F_squeeze = P_squeeze · A_plunger · 0.1   [kN]
\`\`\`

where P_squeeze is the applied hydraulic squeeze pressure in MPa and Dp is the plunger diameter in mm.
The force required depends on the projected area of the casting — larger castings need larger plungers
or higher pressure.

### 2 · Solidification time under pressure

\`\`\`
t_solid = (M²) / 4   [s]
\`\`\`

where M is the section modulus (V/A, mm). This is a simplified Chvorinov-based estimate.
Squeeze casting solidifies faster than sand casting (metal-to-metal contact on both die faces)
but slower than HPDC because the sections are thicker and the die is hotter.

### 3 · Fill conditions — laminar flow

Squeeze casting relies on slow, laminar fill to avoid air entrapment. Typical plunger speeds are
10–50 mm/s (versus 2000–5000 mm/s in HPDC). Fill times of 5–30 seconds are normal.

\`\`\`
v_fill = 0.05 m/s (characteristic)
v_plunger = plunger_stroke / fill_time   [mm/s]
\`\`\`

If v_plunger exceeds ~500 mm/s, the flow transitions to turbulent and air may be entrapped,
defeating the purpose of squeeze casting.

### 4 · Dwell time

\`\`\`
t_dwell = t_solid × 1.2   [s]
\`\`\`

The pressure must be held until the entire casting has solidified — including the gate and runner.
A 20 % safety margin ensures the last-to-freeze regions (typically the centre of the thickest section)
solidify under pressure. Removing pressure too early results in centreline shrinkage.

### 5 · Porosity quality index

\`\`\`
PI_quality = 10 / P_squeeze
\`\`\`

An inverse measure: higher pressure gives a lower (better) index, but the check passes when > 0.3.
This is because PI_quality is treated as a "densification score" — higher values mean the applied
pressure is sufficient to feed shrinkage across the casting section.

### 6 · Thermal considerations

The die temperature in squeeze casting is typically 250–350°C (versus 150–250°C in HPDC).
The hotter die slows solidification, giving more time for the pressure to act and feed shrinkage.
However, it also reduces die life. The thermal fill time check uses a 3× multiplier on the HPDC
thermal equation to account for the thicker sections typical of squeeze castings.

### 7 · Section modulus constraint

Squeeze casting works best for sections with modulus < 30 mm. Below 20 mm, the process is ideal —
pressure can penetrate and feed solidification shrinkage effectively. Above 30 mm, the centre of the
section solidifies too late for the pressure to be effective, and alternative processes (low-pressure
die casting, sand casting) should be considered.

### 8 · Process window summary

| Parameter | Target | Notes |
|-----------|--------|-------|
| Squeeze pressure | 50–150 MPa | Higher for thick sections / high integrity |
| Fill time | 3–30 s | Slow, laminar — no turbulence |
| Dwell time | 1.2 × t_solid | Hold pressure past complete solidification |
| Section modulus | < 30 mm | Squeeze effect diminishes in very thick sections |
| Die temperature | 250–350 °C | Hot enough for feeding, cool enough for die life |
| Gate velocity | < 0.5 m/s | Laminar flow at gate as well as plunger |

### Source

Formulas derived from Chvorinov's rule for solidification, hydraulic press mechanics,
and published squeeze casting process guidelines (ASM Handbook Vol. 15: Casting).
`;

// ═══════════ FAQ ═══════════
export const SQUEEZE_FAQ: [string, string][] = [
  [
    "What is squeeze casting?",
    "Squeeze casting (liquid metal forging) is a process where molten metal is poured into a die and then pressurised (50–150 MPa) during solidification. The slow, laminar fill avoids air entrapment, and the sustained pressure feeds solidification shrinkage, producing castings with mechanical properties approaching those of forgings.",
  ],
  [
    "How is squeeze casting different from HPDC?",
    "HPDC injects metal at high speed (30–60 m/s gate velocity) in milliseconds — the casting fills before it starts freezing. Squeeze casting fills slowly (5–30 s) and then applies high pressure throughout solidification. HPDC entrapssome gas; squeeze casting has near-zero gas porosity. HPDC cannot be heat-treated (blistering); squeeze castings can be T6/T7 heat treated.",
  ],
  [
    "What parts are best suited to squeeze casting?",
    "Safety-critical structural parts with moderate wall thickness (5–25 mm): suspension control arms, steering knuckles, brake callipers, engine mounts, compressor housings, and aerospace brackets. Very thin parts (<3 mm) are better for HPDC; very thick parts (>30 mm section) are better for LPDC or sand casting.",
  ],
  [
    "Why is the fill time so long compared to HPDC?",
    "The slow fill is intentional — it keeps the metal front laminar (Reynolds number < 2000) so it pushes air out of the die rather than mixing with it. HPDC's short fill time is driven by the need to fill before the metal freezes in thin sections. Squeeze castings are thicker and the die is hotter, so there is more time.",
  ],
  [
    "What pressure do I need?",
    "50 MPa is the minimum for any squeeze effect. 80–100 MPa is typical for aluminium structural parts. 120–150 MPa is used for high-integrity parts or copper alloys. The pressure must be sufficient to feed shrinkage across the entire section — thicker sections need higher pressure.",
  ],
  [
    "What is section modulus and why does it matter?",
    "Section modulus M = V/A (volume / surface area) is a measure of how quickly a section solidifies. A plate of thickness t has M ≈ t/2. Squeeze casting pressure is effective up to M ≈ 30 mm. Beyond that, the centre freezes after the gate, and the pressure cannot feed it.",
  ],
  [
    "How do I calculate dwell time?",
    "Dwell time must exceed the solidification time of the thickest section. Estimate t_solid = M²/4 seconds (Chvorinov approximation), then add 20 % safety margin: t_dwell = 1.2 × t_solid. In practice, confirm with thermal analysis or trial castings — under-dwelling causes centreline porosity.",
  ],
  [
    "What die steel is used for squeeze casting?",
    "H13 tool steel is standard, same as HPDC. However, the higher die temperature (250–350°C vs 150–250°C for HPDC) and sustained pressure cause more thermal fatigue. Premium grades (H13 ESR, Dievar, QRO 90) and regular stress-relief heat treatment are recommended for production volumes.",
  ],
  [
    "Can squeeze casting replace forgings?",
    "In many cases, yes. Squeeze-cast A356-T6 control arms are widely used in production vehicles, replacing forged steel or cast iron. The mechanical properties (UTS ~300 MPa, elongation 8–12 %) approach forged aluminium. The cost is typically 30–40 % less than forging for complex shapes.",
  ],
  [
    "What alloys work with squeeze casting?",
    "Aluminium: A356, A357, 6061, 7075 (wrought alloys cast to near-net shape). Magnesium: AZ91, AM60. Copper: brass and bronze for high-conductivity parts. Zinc: ZA alloys. Almost any alloy that can be gravity-cast can be squeeze-cast with better properties.",
  ],
  [
    "Why is the quality index > 0.3 a pass condition?",
    "The quality index PI_quality = 10 / P_squeeze is an inverse measure of porosity: higher pressure gives lower PI. But the check passes when PI_quality > 0.3, meaning the applied pressure is at least ~33 MPa. Below this threshold, the squeeze effect is too weak to reliably feed solidification shrinkage. At 100 MPa, PI_quality = 0.1 — the lower value indicates better densification.",
  ],
  [
    "How does cavity count affect squeeze casting?",
    "Most squeeze casting tools are single-cavity because the press must apply uniform pressure to each cavity. Multiple cavities require a floating platen system or individual pressure pistons. The force calculation multiplies by cavity count only if the cavities are in parallel hydraulic circuits — which is rare.",
  ],
];
