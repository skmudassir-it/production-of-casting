// ═══════════════════════════════════════════════════════════════
// LPDC (Low Pressure Die Casting) Process Calculation Engine
// ═══════════════════════════════════════════════════════════════

const PI = Math.PI;

const fmt = (v: number, d = 2): string =>
  !isFinite(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });

// ── DEFAULT INPUTS (all strings) ──────────────────────────────
export const LPDC_DEFAULTS = {
  furnacePressure: "0.5",   // bar — furnace air pressure
  riserTubeDia: "80",        // mm — riser tube internal diameter
  castingHeight: "300",      // mm — height from metal surface to die cavity top
  castWt: "5000",            // g — casting weight per cavity (including feeders)
  alloyDensity: "2.65",      // g/cc — density of molten alloy
  meltTemp: "720",           // °C — metal temperature at furnace
  dieTemp: "250",            // °C — die surface temperature
  cavities: "1",             // — number of cavities
  wallThk: "5",              // mm — minimum wall thickness
  solidFraction: "0",        // % — allowable solid fraction at end of fill
  gateArea: "500",           // mm² — total gate cross-sectional area
  kThermal: "0.0346",        // s/cm — empirical thermal constant (Al ≈ 0.0346)
  Tf: "580",                 // °C — minimum flow temperature (liquidus)
  Z: "3.8",                  // °C — conversion factor (superheat → equivalent solid fraction)
  alloy: "",                 // — selected material / alloy name
};

// ── COMPUTE FUNCTION ──────────────────────────────────────────
export function computeLPDC(inp: Record<string, string>) {
  const n = (k: string) => { const v = parseFloat(inp[k]); return isNaN(v) ? 0 : v; };

  const Pbar    = n("furnacePressure");   // bar
  const Dt      = n("riserTubeDia");      // mm
  const Hc      = n("castingHeight");     // mm
  const Wc      = n("castWt");            // g
  const rho     = n("alloyDensity");      // g/cc
  const Tm      = n("meltTemp");          // °C
  const Td      = n("dieTemp");           // °C
  const cav     = n("cavities");
  const tw      = n("wallThk");           // mm
  const S       = n("solidFraction");     // %
  const Ag      = n("gateArea");          // mm²
  const k       = n("kThermal");          // s/cm
  const Tf      = n("Tf");                // °C
  const Z       = n("Z");                 // °C

  // --- Metal pressure at die base ---
  const P_MPa   = Pbar * 0.0981;                           // MPa (bar → MPa: 1 bar = 0.0981 MPa approx)
  const P_kgf   = Pbar * 1.0197;                           // kgf/cm²

  // --- Pressure required to lift metal to casting height ---
  const P_fill_MPa = (rho * 9.81 * Hc) / 100000;           // MPa
  const P_fill_kgf = P_fill_MPa * 10.1972;                 // kgf/cm²

  // --- Fill velocity (Bernoulli) ---
  // v = sqrt(2 * (P_furnace*100000 / ρ) - 2 * 9.81 * H_casting) / 100   (m/s)
  // Terms: P in bar, ρ in g/cc, H in mm.  The /100 converts from cm/s to m/s.
  const disc  = 2 * (Pbar * 100000 / rho) - 2 * 9.81 * Hc;
  const v     = disc > 0 ? Math.sqrt(disc) / 100 : 0;       // m/s

  // --- Volumetric flow rate ---
  // Q = v * (π/4) * (D_tube/10)²   (cc/s)
  // v already incorporates /100 from Bernoulli; tube area in cm²; product → cc/s
  const A_tube = (PI / 4) * Math.pow(Dt / 10, 2);          // cm²
  const Q      = v * A_tube;                                 // cc/s

  // --- Cavity volume ---
  const V      = (Wc * cav) / rho;                           // cc

  // --- Fill time ---
  const t_fill = Q > 0 ? V / Q : Infinity;                  // s

  // --- Gate velocity ---
  // Vg = Q / gateArea   (m/s)
  // Q in cc/s, gateArea in mm²; the ratio directly yields m/s
  const Vg     = Ag > 0 ? Q / Ag : Infinity;                 // m/s

  // --- Reynolds number ---
  // Re = ρ × Vg × D_hyd / μ
  // Using task simplified formula:
  // Re = alloyDensity(g/cc) × Vg(m/s) × riserTubeDia(m) × 1000 / 0.001(Pa·s)
  // Simplified: Re = alloyDensity × Vg × riserTubeDia × 1e6 / 1
  const mu     = 0.001;                                     // Pa·s (dynamic viscosity of molten Al)
  const Re     = rho * Vg * (Dt / 1000) / mu;               // dimensionless

  // --- Theoretical fill time (thermal) ---
  const t_thermal = k * ((Tm - Tf + S * Z) / (Tf - Td)) * tw;  // s

  // --- Solidification time (approximate Chvorinov) ---
  const t_solid = (tw * tw) / 4;                            // s

  // --- Pressure adequacy ---
  const pressureAdequate = P_fill_kgf > 0 ? P_kgf / P_fill_kgf : Infinity;

  return {
    P_MPa,
    P_kgf,
    P_fill_MPa,
    P_fill_kgf,
    v,
    A_tube,
    Q,
    V,
    t_fill,
    Vg,
    Re,
    t_thermal,
    t_solid,
    pressureAdequate,
  };
}

// ── PROCESS CHECKS ───────────────────────────────────────────
export function lpdcChecks(
  inp: Record<string, string>,
  c: ReturnType<typeof computeLPDC>
) {
  const n = (k: string) => { const v = parseFloat(inp[k]); return isNaN(v) ? 0 : v; };
  const VgMin = 0.3;
  const VgMax = 0.8;

  return [
    {
      label: "Furnace pressure adequate",
      ok: c.P_kgf > c.P_fill_kgf,
      rule: `Furnace P > fill head (${fmt(c.P_kgf, 1)} > ${fmt(c.P_fill_kgf, 1)} kgf/cm²)`,
      val: `${fmt(c.pressureAdequate, 2)}× head`,
    },
    {
      label: "Fill time within thermal limit",
      ok: c.t_fill < c.t_thermal,
      rule: `t_fill < t_thermal (${fmt(c.t_fill, 2)} < ${fmt(c.t_thermal, 2)} s)`,
      val: `${fmt(c.t_fill, 2)} s`,
    },
    {
      label: "Gate velocity in range",
      ok: c.Vg >= VgMin && c.Vg <= VgMax,
      rule: `${VgMin} – ${VgMax} m/s`,
      val: `${fmt(c.Vg, 2)} m/s`,
    },
    {
      label: "Laminar fill (Re < 2000)",
      ok: c.Re < 2000,
      rule: "Re < 2,000",
      val: `Re = ${fmt(c.Re, 0)}`,
    },
    {
      label: "Solidification after fill",
      ok: c.t_solid > c.t_fill,
      rule: `t_solid > t_fill (${fmt(c.t_solid, 2)} > ${fmt(c.t_fill, 2)} s)`,
      val: `${fmt(c.t_solid, 2)} s`,
    },
  ];
}

// ── DOCUMENTATION ────────────────────────────────────────────
export const LPDC_DOC = `
  <p>
    <strong>Low Pressure Die Casting (LPDC)</strong> fills the die from below by pressurising the
    surface of a molten metal bath inside a sealed furnace. Dry air (typically 0.3–0.8 bar) pushes
    metal up a ceramic riser tube into the die cavity. Because the metal rises smoothly and the fill
    front is always advancing into quiescent metal (no free-fall splashing), LPDC produces castings
    with very low porosity and excellent mechanical properties — the dominant process for aluminium
    road wheels and cylinder heads.
  </p>

  <h3>1 · Metal pressure at the die base</h3>
  <p>
    Furnace over-pressure (bar gauge) is converted to metal pressure at the die parting line.
    Two common units are computed:
  </p>
  <pre>P (MPa)    = P<sub>furnace</sub> × 0.0981</pre>
  <pre>P (kgf/cm²) = P<sub>furnace</sub> × 1.0197</pre>

  <h3>2 · Fill pressure head</h3>
  <p>
    The static pressure needed simply to lift the metal column from the furnace free surface
    to the top of the casting:
  </p>
  <pre>P<sub>fill</sub> (MPa) = ρ × 9.81 × H<sub>casting</sub> / 100 000</pre>
  <p>where ρ is alloy density (g/cc) and H<sub>casting</sub> is the casting height (mm).
  The furnace pressure must exceed this value, otherwise metal never reaches the die.</p>

  <h3>3 · Fill velocity (Bernoulli)</h3>
  <p>
    Applying Bernoulli between the furnace free surface (velocity ≈ 0) and the die inlet:
  </p>
  <pre>v = √[ 2 × (P<sub>furnace</sub> × 100 000 / ρ) − 2 × 9.81 × H<sub>casting</sub> / 1000 ]   (m/s)</pre>
  <p>
    The velocity is only computed when the pressure head exceeds the gravitational head;
    otherwise v = 0.
  </p>

  <h3>4 · Volumetric flow rate</h3>
  <pre>Q = v × (π / 4) × (D<sub>tube</sub> / 10)² × 100   (cc/s)</pre>
  <p>D<sub>tube</sub> is the riser tube internal diameter in mm; the factor /10 converts to cm,
  ×100 converts m/s to cm/s, giving cc/s.</p>

  <h3>5 · Fill time</h3>
  <pre>Cavity volume V = casting weight × cavities / density   (cc)</pre>
  <pre>Fill time t = V / Q   (s)</pre>

  <h3>6 · Gate velocity</h3>
  <pre>V<sub>g</sub> = Q / (gate area × 100)   (m/s)</pre>
  <p>Typical LPDC gate velocities are 0.3–0.8 m/s — much lower than HPDC (25–40 m/s)
  because the fill is gravity-assisted and turbulence must be avoided.</p>

  <h3>7 · Reynolds number</h3>
  <pre>Re = ρ · V<sub>g</sub> · D<sub>hyd</sub> / μ</pre>
  <p>
    ρ = density (kg/m³), D<sub>hyd</sub> = riser tube diameter (m), μ = 0.001 Pa·s
    (approximate dynamic viscosity of molten aluminium).
    Re &lt; 2 000 indicates laminar flow — highly desirable for LPDC quality.
  </p>

  <h3>8 · Theoretical fill time (thermal limit)</h3>
  <p>Same NADCA thermal equation used in HPDC:</p>
  <pre>t<sub>thermal</sub> = k × ( (T<sub>melt</sub> − T<sub>f</sub> + S × Z) / (T<sub>f</sub> − T<sub>die</sub>) ) × wall thickness</pre>
  <p>
    k = 0.0346 s/cm (aluminium), S = allowable solid fraction (%), Z = conversion factor (°C).
    If the actual fill time exceeds this value, the metal begins to freeze before the cavity
    is completely full — a guaranteed scrap condition.
  </p>

  <h3>9 · Solidification time</h3>
  <pre>t<sub>solid</sub> ≈ wall_thk² / 4   (s)</pre>
  <p>
    A simplified Chvorinov approximation. Section thickness is the dominant variable;
    the constant lumps mould material and metal properties. Solidification time must exceed
    fill time or the metal freezes in the gate.
  </p>

  <h3>Process window summary</h3>
  <ul>
    <li>Furnace pressure: must exceed the static fill head</li>
    <li>Gate velocity: 0.3 – 0.8 m/s</li>
    <li>Reynolds number: &lt; 2 000 (laminar)</li>
    <li>Fill time: less than the thermal limit</li>
    <li>Solidification time: greater than fill time</li>
  </ul>

  <h3>Source</h3>
  <p>
    Formulas adapted from standard low-pressure die casting handbooks (NADCA, FOSECO,
    and Campbell's <em>Complete Casting Handbook</em>). The Bernoulli fill model assumes
    quasi-steady flow; transient effects (initial acceleration, melt front inertia) are
    neglected, which is conservative for LPDC where fill times are typically 5–30 seconds.
  </p>
`;

// ── FAQ ──────────────────────────────────────────────────────
export const LPDC_FAQ: [string, string][] = [
  [
    "What does the LPDC calculator compute?",
    "It models the low-pressure die casting fill process: metal pressure at the die base, fill velocity, flow rate, cavity fill time, gate velocity, Reynolds number, the thermal fill-time limit, and an approximate solidification time. It checks whether your furnace pressure, riser tube size, and gating choices produce a viable process.",
  ],
  [
    "What is the difference between LPDC and HPDC?",
    "LPDC uses low furnace pressure (0.3–0.8 bar) to push metal gently up a riser tube into the die. HPDC injects metal at high speed (25–40 m/s gate velocity) under hundreds of kgf/cm². LPDC fill is laminar and slow (5–30 s); HPDC fill is turbulent and fast (0.01–0.10 s). LPDC produces higher-integrity, heat-treatable castings; HPDC produces higher volumes at lower cost.",
  ],
  [
    "Why is laminar flow (Re < 2000) so important in LPDC?",
    "Turbulence folds the oxide skin on the advancing melt front into the casting, creating bifilm defects that are the root cause of most casting leaks and fatigue failures. LPDC's key advantage is that the riser tube delivers metal from below the bath surface, so the metal entering the die has never been exposed to air. Keeping Re low preserves that advantage.",
  ],
  [
    "How do I choose the furnace pressure?",
    "Start with the minimum pressure needed to overcome the static head: P > ρgh. Add 0.1–0.2 bar for flow. A good starting point is 0.5 bar for casting heights up to 300 mm with aluminium. Too high a pressure causes jetting at the gate; too low means the cavity never fills. Watch the gate velocity check — it's your best guide.",
  ],
  [
    "What riser tube diameter should I use?",
    "Common sizes are 60–100 mm ID for aluminium. A larger tube gives higher flow rate at the same pressure (good for heavy castings) but increases the metal inventory and heat loss. A smaller tube restricts flow. The calculator lets you try different diameters to find one that keeps fill time below the thermal limit without exceeding the gate velocity window.",
  ],
  [
    "How do I interpret the thermal fill-time check?",
    "The thermal equation (NADCA method) computes the maximum time you have before the metal starts to freeze in the thin sections. If your actual fill time is longer, the melt front will be partially solid when it reaches the far end of the cavity — causing cold shuts and misruns. Either increase furnace pressure, enlarge the gate, or raise the melt/die temperatures.",
  ],
  [
    "What casting height value should I enter?",
    "Measure from the furnace metal free surface (when the furnace is full) to the highest point of the cavity. For a wheel casting in a vertical machine this is typically 200–500 mm. For a horizontally-parting die it's the cope height. If in doubt, use the maximum die cavity height — it's the worst case for pressure requirement.",
  ],
  [
    "Why does the gate velocity need to stay below 0.8 m/s in LPDC?",
    "Above about 0.8 m/s, the metal jet entering the cavity can break up and cause turbulence even in an otherwise-laminar system. The oxide skin folds in and creates bifilm defects. Gate velocities of 0.3–0.5 m/s are common in production LPDC of aluminium wheels.",
  ],
  [
    "What is the 'solid fraction at end of fill' (S)?",
    "It's the percentage of the metal that is allowed to be solid before the cavity is completely full. S = 0 % means no solid is tolerated (conservative for thin walls). S = 15–20 % is used for thick-section, slow-filling castings where some mushy-zone flow is acceptable. Higher S values increase the allowable fill time.",
  ],
  [
    "How accurate is the solidification-time estimate?",
    "The t_solid = wall_thk²/4 formula is a rough Chvorinov approximation with a lumped mould constant. Actual solidification depends on die coating, die temperature distribution, section modulus, and whether the die is water-cooled. Use this check as a go/no-go sanity test; precise solidification modelling requires casting simulation software (MAGMA, ProCAST).",
  ],
  [
    "How does cavity count affect the calculation?",
    "The total cavity volume is (casting weight × cavities) / density. More cavities mean a larger volume to fill, increasing the required fill time for the same flow rate. You may need to increase furnace pressure or riser tube diameter to keep fill time within limits when adding cavities.",
  ],
  [
    "What alloy densities should I use?",
    "Aluminium alloys: 2.65–2.70 g/cc (liquid). Typical values: AlSi7Mg (A356) = 2.68, AlSi11 = 2.65, AlSi9Cu3 = 2.70. Magnesium alloys: ~1.74 g/cc. The density affects both the fill pressure head and the cavity volume calculation — use the liquid density at casting temperature, not room-temperature solid density.",
  ],
  [
    "Can I use this calculator for magnesium LPDC?",
    "Yes — change the alloy density to ~1.74 g/cc and adjust the thermal constant 'k' if your foundry has calibrated values. Magnesium's lower density means lower pressure head requirements; furnace pressures of 0.2–0.5 bar are typical. The Reynolds number will differ because of the lower density, but the same laminar-flow criterion (Re < 2000) applies.",
  ],
  [
    "What if the 'pressure adequate' check fails?",
    "Your furnace pressure cannot even lift the metal to the die — the casting will never fill. Solutions: (a) increase furnace pressure, (b) reduce casting height by reorienting the part in the die, (c) reduce alloy density (not practical), or (d) accept that this part may need gravity or tilt pouring instead of LPDC.",
  ],
];
