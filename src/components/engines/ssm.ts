// ═══════════════════════════════════════════════════════════════════
// SSM / RHEOCASTING CALCULATION ENGINE
// Semi-Solid Metal (SSM) process design for aluminium alloys
// Covers both Rheocasting and Thixocasting variants
// ═══════════════════════════════════════════════════════════════════

const fmt = (v: number, d = 2): string =>
  !isFinite(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });

// ═══════════ DEFAULT INPUTS ═══════════
export const SSM_DEFAULTS: Record<string, string> = {
  // Slurry / thermal
  solidFraction: "40",       // % — target solid fraction of the slurry
  slurryTemp: "585",        // °C — actual slurry / billet temperature
  liquidusTemp: "615",      // °C — liquidus temperature of the alloy
  solidusTemp: "555",       // °C — solidus temperature of the alloy
  Ti: "585",                // °C — initial slurry temperature entering die
  Tf: "555",                // °C — minimum flow (solidus) temperature
  Td: "250",                // °C — die surface temperature
  Z: "3.8",                 // — units conversion factor (NADCA convention)

  // Machine & shot
  plungerDia: "80",         // mm — plunger diameter Dp
  shotWt: "2000",           // g — total shot weight
  alloy: "AlSi132 (Al-Si)", // material selection
  density: "2.65",          // g/cc — alloy density (Al-Si ≈ 2.65)
  cavities: "1",            // — number of cavities

  // Gating
  gateArea: "150",          // mm² — total gate cross-sectional area
  gateVelocity: "2",        // m/s — target gate velocity (SSM is laminar: 0.5–5 m/s)
  fillTime: "0.08",         // s — targeted fill time

  // Part geometry
  wallThk: "5",             // mm — average wall thickness
  sectionMod: "8",          // mm — section modulus (effective thickness for solidification)

  // Rheology constants
  kShape: "1.82",           // Pa·s — consistency index / shape factor for power-law viscosity
  maxShearRate: "100",      // 1/s — characteristic maximum shear rate in the system
};

// ═══════════ COMPUTE ENGINE ═══════════
export function computeSSM(inp: Record<string, string>) {
  const n = (k: string) => {
    const v = parseFloat(inp[k] as string);
    return isNaN(v) ? 0 : v;
  };

  const solidFraction = n("solidFraction");
  const slurryTemp = n("slurryTemp");
  const liquidusTemp = n("liquidusTemp");
  const solidusTemp = n("solidusTemp");
  const Dp = n("plungerDia");
  const shotWt = n("shotWt");
  const rho = n("density");
  const gateArea = n("gateArea");
  const Vg = n("gateVelocity");
  const tFillTarget = n("fillTime");
  const wallThk = n("wallThk");
  const kShape = n("kShape");
  const maxShearRate = n("maxShearRate");
  const Ti = n("Ti");
  const Tf = n("Tf");
  const Td = n("Td");
  const Z = n("Z");
  const sectionMod = n("sectionMod");
  const cavities = n("cavities");

  // ── Fraction solid from temperature ──
  const FsThermal =
    liquidusTemp !== solidusTemp
      ? Math.max(0, Math.min(100, ((liquidusTemp - slurryTemp) / (liquidusTemp - solidusTemp)) * 100))
      : 0;
  const Fs = solidFraction > 0 ? solidFraction : FsThermal;
  const FsDecimal = Fs / 100;

  // ── Apparent viscosity (semi-solid Al alloy) ──
  // eta = 0.1 · exp(5 · Fs/100)   [Pa·s]
  // Valid for Fs 30–50 %; gives ~0.4–2.7 Pa·s which matches literature
  const eta = 0.1 * Math.exp(5 * FsDecimal);

  // ── Power-law index n ──
  // n ≈ 1 − Fs/100 · 0.8  (agglomeration reduces flow behaviour index)
  const powerLawN = Math.max(0.05, 1 - FsDecimal * 0.8);

  // ── Power-law viscosity at characteristic shear rate ──
  const etaPowerLaw = kShape * Math.pow(maxShearRate, powerLawN - 1);

  // ── Shear rate at gate (approximate) ──
  const gammaDotGate = gateArea > 0 ? (Vg * 1000) / Math.sqrt(gateArea) : 0;

  // ── Flow rate ──
  const Q = gateArea * Vg * 100; // cc/s

  // ── Cavity volume ──
  const cavityVol = rho > 0 ? shotWt / rho : 0; // cc

  // ── Actual fill time ──
  const tFillActual = Q > 0 ? cavityVol / Q : Infinity; // s

  // ── Reynolds number (semi-solid flow) ──
  // Re = ρ · Vg · sqrt(gateArea) / (η · 10)
  const ReSSM = eta > 0 ? (rho * Vg * Math.sqrt(gateArea)) / (eta * 10) : Infinity;

  // ── Plunger velocity ──
  const vPlunger = Dp > 0 ? Q / ((Math.PI / 4) * Dp * Dp) / 100 : 0; // m/s

  // ── Solidification time (modified Chvorinov for semi-solid) ──
  // t_solid = (sectionMod/2)² / (4 · (1 − Fs/200))
  const denom = 4 * (1 - Fs / 200);
  const tSolid = denom > 0 ? Math.pow(sectionMod / 2, 2) / denom : Infinity; // s

  // ── Theoretical fill time (thermal — NADCA equation adapted for SSM) ──
  // t = k · ((Ti − Tf + S·Z) / (Tf − Td)) · T(wall)  where S = solid fraction %
  const tFillTheo = (() => {
    if (Tf - Td <= 0) return Infinity;
    const S = Fs; // use computed solid fraction as the "S" parameter
    return 0.0346 * ((Ti - Tf + S * Z) / (Tf - Td)) * wallThk;
  })();

  // ── Porosity index ──
  // Lower solid fraction = more liquid = more potential shrinkage porosity
  // PI = (1 − Fs/100) · 0.02 · (1 − min(η/100, 1))
  const liquidFraction = 1 - FsDecimal;
  const viscosityPenalty = 1 - Math.min(eta / 100, 1);
  const porosityIndex = liquidFraction * 0.02 * viscosityPenalty;

  // ── Cavity fill pressure (approximate from Bernoulli for SSM) ──
  // P ≈ (ρ/2000) · Vg² · (1 + Fs/100) — semi-solid correction factor
  const fillPressure = (rho / 2000) * Vg * Vg * (1 + FsDecimal); // kgf/cm² approx

  // ── Gate thickness (assuming fan gate, width ≈ 10× thickness) ──
  const gateThickness = gateArea > 0 ? Math.sqrt(gateArea / 10) : 0; // mm
  const gateWidthEst = gateThickness > 0 ? gateArea / gateThickness : 0; // mm

  // ── Shot volume & fill ratio ──
  const shotVol = rho > 0 ? shotWt / rho : 0; // cc
  const sleeveArea = (Math.PI / 4) * Dp * Dp; // mm²
  const fillRatio = sleeveArea > 0 ? (shotVol * 1000) / (sleeveArea * 350) * 100 : 0; // % (assume 350 mm sleeve)

  // ── Thixotropic index (ratio of eta at low vs high shear) ──
  const thixoIndex = etaPowerLaw > 0 ? eta / etaPowerLaw : Infinity;

  return {
    // Primary outputs
    Fs,
    FsThermal,
    FsDecimal,
    eta,
    powerLawN,
    etaPowerLaw,
    gammaDotGate,
    Q,
    cavityVol,
    tFillActual,
    tFillTarget,
    ReSSM,
    vPlunger,
    tSolid,
    tFillTheo,
    porosityIndex,
    fillPressure,
    gateThickness,
    gateWidthEst,
    shotVol,
    fillRatio,
    thixoIndex,
    // Input passthrough for display
    solidFraction,
    slurryTemp,
    liquidusTemp,
    solidusTemp,
    Dp,
    shotWt,
    rho,
    gateArea,
    Vg,
    wallThk,
    sectionMod,
    kShape,
    maxShearRate,
    Ti,
    Tf,
    Td,
    Z,
    cavities,
  };
}

// ═══════════ PROCESS CHECKS ═══════════
export function ssmChecks(
  inp: Record<string, string>,
  c: ReturnType<typeof computeSSM>
) {
  return [
    {
      label: "Solid fraction",
      ok: c.Fs >= 30 && c.Fs <= 50,
      rule: "30 – 50 % (sweet spot for SSM rheocasting)",
      val: `${fmt(c.Fs, 1)} %`,
    },
    {
      label: "Slurry temperature in mushy zone",
      ok: c.slurryTemp > c.solidusTemp && c.slurryTemp < c.liquidusTemp,
      rule: `${c.solidusTemp} < T slurry < ${c.liquidusTemp} °C`,
      val: `${c.slurryTemp} °C`,
    },
    {
      label: "Apparent viscosity",
      ok: c.eta >= 1 && c.eta <= 100,
      rule: "1 – 100 Pa·s (processable SSM range)",
      val: `${fmt(c.eta, 2)} Pa·s`,
    },
    {
      label: "Gate velocity (laminar fill)",
      ok: c.Vg >= 0.5 && c.Vg <= 5,
      rule: "0.5 – 5 m/s (SSM requires laminar fill)",
      val: `${fmt(c.Vg, 1)} m/s`,
    },
    {
      label: "Reynolds number",
      ok: c.ReSSM < 10,
      rule: "< 10 (SSM must stay well inside laminar regime)",
      val: `${fmt(c.ReSSM, 2)}`,
    },
    {
      label: "Actual fill time",
      ok: c.tFillActual < 0.2,
      rule: "< 0.2 s (thin-wall semi-solid still needs speed)",
      val: `${fmt(c.tFillActual, 4)} s`,
    },
    {
      label: "Plunger velocity",
      ok: c.vPlunger > 0 && c.vPlunger < 2,
      rule: "< 2 m/s (typical SSM shot profile)",
      val: `${fmt(c.vPlunger, 3)} m/s`,
    },
    {
      label: "Solidification time vs fill time",
      ok: c.tSolid > c.tFillActual,
      rule: "t_solid > t_fill (complete filling before freeze)",
      val: `t_solid = ${fmt(c.tSolid, 4)} s, t_fill = ${fmt(c.tFillActual, 4)} s`,
    },
    {
      label: "Porosity index",
      ok: c.porosityIndex < 0.015,
      rule: "< 0.015 (acceptably low shrinkage porosity risk)",
      val: fmt(c.porosityIndex, 5),
    },
    {
      label: "Thixotropic index",
      ok: c.thixoIndex > 2,
      rule: "> 2 (adequate shear-thinning behaviour)",
      val: fmt(c.thixoIndex, 1),
    },
  ];
}

// ═══════════ ENGINE DOCUMENTATION ═══════════
export const SSM_DOC = `
  <h2>SSM / Rheocasting Process Design — how every number is calculated</h2>

  <p>
    This module designs the process for <b>Semi-Solid Metal (SSM) casting</b> — also called
    <b>Rheocasting</b> (when the slurry is prepared directly from liquid) or
    <b>Thixocasting</b> (when a pre-cast billet is reheated into the semi-solid range).
    Unlike conventional HPDC where fully liquid metal is injected at 25–40 m/s, SSM injects a
    slurry of ~30–50 % solid globules suspended in liquid at 0.5–5 m/s. The result is
    <b>laminar filling</b>, dramatically reduced porosity, and heat-treatable castings.
  </p>

  <h3>1 · Fraction solid — the heart of SSM</h3>
  <p>
    All SSM properties flow from the solid fraction Fs. You can either enter it directly
    (if measured via thermal analysis or quenching) or let the engine compute it from the
    slurry temperature using the Scheil / lever-rule approximation:
  </p>
  <code>Fs = (T_liquidus − T_slurry) / (T_liquidus − T_solidus) × 100  [%]  (clamped 0–100)</code>
  <p>
    For aluminium A356/357 (typical SSM alloys): liquidus ≈ 615 °C, solidus ≈ 555 °C.
    The sweet spot for rheocasting is <b>30–50 % solid</b>. Below 30 % the slurry behaves
    too much like a liquid (turbulence returns); above 50 % it becomes too viscous to fill
    thin sections.
  </p>

  <h3>2 · Apparent viscosity — the thixotropic behaviour</h3>
  <p>
    Semi-solid slurries are <b>shear-thinning</b>: they flow like a thick paste at rest but
    thin out dramatically under shear. The engine uses an exponential model calibrated for
    aluminium alloys:
  </p>
  <code>η_app = 0.1 · exp(5 · Fs/100)   [Pa·s]</code>
  <p>
    At 30 % solid → η ≈ 0.45 Pa·s (thin honey). At 40 % → η ≈ 0.74 Pa·s. At 50 % → η ≈ 1.22 Pa·s.
    The processability window is roughly 1–100 Pa·s. The power-law variant is also computed:
  </p>
  <code>n = 1 − (Fs/100) · 0.8</code>
  <code>η_powerlaw = k · γ̇ⁿ⁻¹   [Pa·s]   where k = shape factor, γ̇ = shear rate</code>
  <p>
    The ratio η_app / η_powerlaw is the <b>thixotropic index</b> — values above 2 indicate
    good shear-thinning behaviour that helps the slurry flow through thin gates.
  </p>

  <h3>3 · Gate shear rate and Reynolds number</h3>
  <code>γ̇_gate = Vg · 1000 / √(gate_area)   [1/s]</code>
  <code>Re_SSM = ρ · Vg · √(gate_area) / (η · 10)   [dimensionless]</code>
  <p>
    Conventional HPDC operates at Re > 10⁴ with severe turbulence. SSM targets <b>Re < 10</b>
    (ideally < 1) for truly laminar filling. The low Reynolds number is what eliminates
    air entrapment and allows the resulting castings to be welded and heat-treated (T6).
    Gate velocities of <b>0.5–5 m/s</b> (vs 25–40 m/s in HPDC) are the enabler.
  </p>

  <h3>4 · Flow rate, cavity volume and fill time</h3>
  <code>Q = gate_area · Vg · 100   [cc/s]</code>
  <code>V_cavity = shot_weight / density   [cc]</code>
  <code>t_fill = V_cavity / Q   [s]</code>
  <p>
    Despite the lower gate velocity, fill times can still be very short (0.03–0.15 s)
    because SSM gates are typically much larger than HPDC gates — often 3–10× the area.
    Thin-wall castings (< 3 mm) still demand t_fill < 0.2 s to avoid premature freezing.
  </p>

  <h3>5 · Plunger velocity</h3>
  <code>v_plunger = Q / (π/4 · Dp²) / 100   [m/s]</code>
  <p>
    Because SSM uses slower gate velocities and larger gates, plunger speeds are typically
    <b>0.1–1.5 m/s</b>, an order of magnitude slower than conventional HPDC. This gentle
    acceleration is critical to maintain the laminar flow front and avoid breaking the
    semi-solid structure.
  </p>

  <h3>6 · Solidification time (modified Chvorinov for semi-solid)</h3>
  <code>t_solid = (section_modulus/2)² / (4 · (1 − Fs/200))   [s]</code>
  <p>
    The classic Chvorinov rule (t ∝ (V/A)²) is modified here: the pre-existing solid
    fraction means less latent heat must be extracted, so solidification is <b>faster</b>
    than for fully liquid metal. At Fs = 40 %, the denominator becomes 4 · 0.8 = 3.2,
    giving roughly 25 % shorter solidification time. This is why SSM can fill thinner
    sections than conventional HPDC — the slurry arrives "half frozen" and completes
    solidification quickly with less shrinkage.
  </p>

  <h3>7 · Porosity index</h3>
  <code>PI = (1 − Fs/100) · 0.02 · (1 − min(η/100, 1))</code>
  <p>
    This semi-empirical index combines two shrinkage drivers: <b>liquid fraction</b>
    (more liquid → more volumetric contraction on freezing) and <b>viscosity</b>
    (a very high viscosity prevents liquid from feeding interdendritic shrinkage).
    Values below 0.015 are considered low-risk; values above 0.03 suggest increasing
    solid fraction or intensification pressure.
  </p>

  <h3>8 · Theoretical fill time (thermal)</h3>
  <code>t_fill_theo = 0.0346 · ((Ti − Tf + S·Z) / (Tf − Td)) · T_wall   [s]</code>
  <p>
    Adapted from the NADCA thermal equation used in the PQ² engine. The solid fraction
    (S = Fs) enters the numerator, tightening the allowable fill time window for slurries
    that are already near their solidus. Compare this with the actual fill time to ensure
    the slurry does not freeze in the gate before the cavity is full.
  </p>

  <h3>9 · Rheocasting vs Thixocasting vs Conventional HPDC</h3>
  <p>
    <b>Rheocasting:</b> molten alloy is cooled into the semi-solid range with vigorous
    stirring (mechanical or electromagnetic) to create a slurry of fine, rounded α-Al
    globules. The slurry is transferred directly to the shot sleeve. Lower cost, continuous
    process. Dominant SSM route today.
  </p>
  <p>
    <b>Thixocasting:</b> a pre-cast billet with a globular microstructure is induction-heated
    to the semi-solid range and then injected. Better process control but higher billet cost.
    Used for aerospace and premium automotive parts.
  </p>
  <p>
    <b>Advantages over conventional HPDC:</b> laminar fill = no air entrapment = weldable +
    heat-treatable (T6) castings; 50–80 % less porosity; lower die temperatures → longer die
    life; near-net-shape with less machining stock; better mechanical properties (elongation
    8–15 % vs 2–5 % for HPDC).
  </p>
`;

// ═══════════ FAQ ═══════════
export const SSM_FAQ: [string, string][] = [
  [
    "What is SSM / semi-solid metal casting?",
    "SSM casting processes inject metal that is part-solid, part-liquid (typically 30–50 % solid fraction) instead of fully molten metal. The slurry behaves thixotropically — it flows like a liquid under shear but holds its shape at rest. This enables laminar mould filling, dramatically reducing porosity and producing heat-treatable castings.",
  ],
  [
    "What is the difference between rheocasting and thixocasting?",
    "Rheocasting prepares the semi-solid slurry directly from the melt by controlled cooling with stirring, then transfers it to the shot sleeve. Thixocasting starts with a pre-cast, fine-grained billet that is reheated into the semi-solid range. Rheocasting is less expensive (no billet cost) and dominates production; thixocasting offers tighter process control for critical parts.",
  ],
  [
    "Why does SSM produce less porosity than conventional die casting?",
    "Conventional HPDC injects at 25–40 m/s, creating turbulent flow that traps air and forms oxide bifilms. SSM injects at 0.5–5 m/s, achieving laminar (non-turbulent) filling — the metal front advances as a smooth wave, pushing air out ahead of it instead of mixing it in. Additionally, the pre-existing solid fraction reduces the total solidification shrinkage by about 40–50 %.",
  ],
  [
    "What solid fraction should I target?",
    "30–50 % is the practical window for aluminium rheocasting. Below 30 %, the slurry behaves too much like a liquid (turbulence returns, dendritic growth possible). Above 50 %, viscosity rises sharply and thin sections (< 3 mm) may not fill. 40 % is the most common starting point. This calculator flags values outside 30–50 %.",
  ],
  [
    "Which aluminium alloys work best for SSM?",
    "Alloys with a wide freezing range (large ΔT between liquidus and solidus) work best because they provide a large temperature window to control the solid fraction. A356/357 (Al-Si-Mg) are the workhorses. A380/ADC12 can also be rheocast though the narrow freezing range requires tighter temperature control. Al-Si-Cu (319) and wrought alloys (6061, 7075) are emerging SSM candidates for structural parts.",
  ],
  [
    "What gate velocity should I use for SSM?",
    "0.5–5 m/s, compared with 25–40 m/s for conventional HPDC. The exact value depends on part geometry: thin walls (< 3 mm) need the higher end (2–5 m/s); thicker sections (5–10 mm) can use 0.5–2 m/s. The gate area is correspondingly larger — typically 3–10× the area of an equivalent HPDC gate.",
  ],
  [
    "What is the Reynolds number telling me and why must it stay low?",
    "The Reynolds number (Re) indicates whether the flow is laminar (Re < 2300) or turbulent (Re > 4000). In SSM we target Re < 10 — two orders of magnitude below the laminar-turbulent transition — because even laminar-flow instabilities can fold the flow front and trap air. Values above 10 suggest either the gate velocity is too high or the gate area is too small.",
  ],
  [
    "How do I measure the solid fraction?",
    "Three common methods: (1) Thermal analysis — compare the cooling curve with the alloy's known liquidus/solidus and apply the Scheil equation (the method used in this calculator's Fs(T) formula). (2) Quench-and-metallography — quench a slurry sample, polish, and measure the area fraction of primary α-Al globules. (3) In-process electrical resistivity or ultrasonic sensors on the shot sleeve.",
  ],
  [
    "Why is the solidification time different for SSM?",
    "The modified Chvorinov equation accounts for the pre-existing solid: because ~40 % of the metal has already solidified before injection, less latent heat must be extracted by the die. SSM solidification times are roughly 20–40 % shorter than for the same part cast conventionally, which means thinner walls can be filled or cycle times can be reduced.",
  ],
  [
    "What is the porosity index and how do I use it?",
    "The porosity index (PI) is a semi-empirical risk indicator combining the liquid fraction (more liquid = more shrinkage on freezing) and the viscosity (very high viscosity prevents feeding). PI < 0.015 is low-risk; 0.015–0.03 is moderate; > 0.03 suggests increasing solid fraction, increasing intensification pressure, or adding feed channels. This is a screening tool, not a substitute for solidification simulation.",
  ],
  [
    "Can SSM parts be heat-treated?",
    "Yes — this is one of the main advantages. Conventional HPDC parts blister during solution treatment because entrapped gas expands. SSM castings have minimal gas porosity, so they can be T6 heat-treated (solution + quench + age) to achieve yield strengths of 250–320 MPa with 8–15 % elongation. This makes SSM competitive with forgings for structural automotive parts like suspension knuckles and control arms.",
  ],
  [
    "What machine modifications are needed for SSM?",
    "Most modern cold-chamber die casting machines can run SSM with three modifications: (1) a larger shot sleeve to accommodate the higher-viscosity slurry, (2) a controlled slow-shot profile (no abrupt acceleration that breaks the semi-solid structure), and (3) a vertical or tilted shot sleeve in some designs to prevent the slurry from sloshing. The plunger speed is typically 0.1–1.5 m/s rather than the 2–6 m/s of HPDC.",
  ],
  [
    "How does the thixotropic index help?",
    "The thixotropic index is the ratio of apparent viscosity at rest (low shear) to the power-law viscosity at a characteristic shear rate. Values > 2 indicate strong shear-thinning: the slurry is paste-like in the shot sleeve (resists sloshing and air entrapment) but flows easily through the gate (where shear rates are high). Values < 1.5 suggest insufficient globular structure — the slurry may behave more like a conventional liquid.",
  ],
  [
    "What are the typical applications for SSM castings?",
    "Automotive: suspension knuckles, control arms, engine mounts, brake callipers, turbocharger housings. Aerospace: structural brackets, door hinges. Electronics: heat sinks with complex thin fins (SSM fills thin sections better than HPDC). Consumer: high-end bicycle frames and components. Any part that needs to be welded, heat-treated, or pressure-tight is a strong SSM candidate.",
  ],
  [
    "How does this calculator compare with the PQ² engine?",
    "The PQ² engine (Conventional die casting tab) designs for turbulent, high-speed injection — it assumes fully liquid metal, gate velocities of 25–40 m/s, and uses the machine power line vs die performance line to find an operating window. This SSM engine is its complement: it designs for laminar, low-speed injection of semi-solid slurry, using solid fraction, viscosity, and Reynolds number as the governing parameters. Both produce the same shop-floor outputs (plunger velocity, fill time, gate sizing) but through fundamentally different physics.",
  ],
  [
    "Can I use the same machine for both HPDC and SSM?",
    "Often yes, with the right plunger/sleeve combination and shot profile programming. The key differences are plunger diameter (SSM typically uses a larger Dp to generate higher flow rates at lower plunger speeds) and the shot velocity profile (SSM needs a gentle, continuous acceleration rather than the abrupt slow-to-fast transition of HPDC). This calculator helps you verify that your chosen plunger and gate combination keeps the Reynolds number in the laminar range.",
  ],
];
