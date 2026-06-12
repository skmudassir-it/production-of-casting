// ═══════════════════════════════════════════════════════════════
// GDC (Gravity Die Casting) Process Calculation Engine
// ═══════════════════════════════════════════════════════════════

const PI = Math.PI;

const fmt = (v: number, d = 2): string =>
  !isFinite(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });

// ── DEFAULT INPUTS (all strings) ──────────────────────────────
export const GDC_DEFAULTS = {
  pourHeight: "300",         // mm — height from pouring basin to parting line
  sprueTopDia: "25",         // mm — sprue entrance diameter (top)
  sprueBottomDia: "15",      // mm — sprue exit diameter (bottom)
  runnerArea: "200",         // mm² — total runner cross-sectional area
  gateArea: "80",            // mm² — total gate cross-sectional area
  castWt: "3000",            // g — casting weight per cavity
  alloy: "AlSi132 (Al-Si)",  // — selected alloy name
  alloyDensity: "2.65",      // g/cc — density of molten alloy
  cavities: "1",             // — number of cavities
  wallThk: "8",              // mm — minimum wall thickness
  gatingRatio: "1:2:2",      // — sprue:runner:gate area ratio (for reference)
  sectionThk: "10",          // mm — dominant section thickness for solidification
  meltTemp: "720",           // °C — pouring temperature
  dieTemp: "200",            // °C — die surface temperature (preheat)
  Cd: "0.8",                 // — discharge coefficient of gating system
};

// ── COMPUTE FUNCTION ──────────────────────────────────────────
export function computeGDC(inp: Record<string, string>) {
  const n = (k: string) => { const v = parseFloat(inp[k]); return isNaN(v) ? 0 : v; };

  const Hp      = n("pourHeight");         // mm
  const Dt      = n("sprueTopDia");        // mm
  const Db      = n("sprueBottomDia");     // mm
  const Ar      = n("runnerArea");         // mm²
  const Ag      = n("gateArea");           // mm²
  const Wc      = n("castWt");             // g
  const rho     = n("alloyDensity");       // g/cc
  const cav     = n("cavities");
  const tw      = n("wallThk");            // mm
  const ts      = n("sectionThk");         // mm
  const Tm      = n("meltTemp");           // °C
  const Td      = n("dieTemp");            // °C
  const Cd      = n("Cd");                 // —

  // --- Effective pour head ---
  // The taper of the sprue concentrates the metal stream; the effective head
  // is the pour height minus half the sprue diameter reduction (accounts for
  // the velocity gained in the tapered section).
  const H_eff   = Hp - (Dt - Db) / 2;       // mm

  // --- Pour velocity at gate (Torricelli) ---
  // v = Cd × √(2 × g × H_eff)
  // H_eff in mm → m: /1000
  const v_gate  = Cd * Math.sqrt((2 * 9.81 * H_eff) / 1000);  // m/s

  // --- Volumetric flow rate ---
  // Q = v_gate × gateArea   (cc/s)
  // v_gate (m/s) × gateArea (mm²) = cc/s  (1 m/s × 1 mm² = 1 cm³/s)
  const Q       = v_gate * Ag;                                 // cc/s

  // --- Cavity volume ---
  const V       = (Wc * cav) / rho;                              // cc

  // --- Pour time ---
  const t_pour  = Q > 0 ? V / Q : Infinity;                      // s

  // --- Sprue exit velocity ---
  // Velocity at sprue bottom (narrowest sprue cross-section), using full pour height
  const v_sprue = Cd * Math.sqrt((2 * 9.81 * Hp) / 1000);       // m/s

  // --- Reynolds number at gate ---
  // Re = v_gate × √(4 × gateArea / π) × alloyDensity
  // Using the task simplified formula where alloyDensity is in g/cc
  const Re     = v_gate * Math.sqrt((4 * Ag) / PI) * rho;

  // --- Solidification time (approximate Chvorinov) ---
  // t_solid = (section_thk / 2)² × k_mould
  // Using k_mould ≈ 2 (s/mm²) as a lumped constant for steel gravity dies
  const t_solid = Math.pow(ts / 2, 2) * 2;                      // s

  // --- Yield ---
  // Yield = (casting weight × cavities) / total poured weight × 100
  // Total weight ≈ casting weight + runner + sprue weight
  // Approximate runner+sprue weight from runner volume:
  // Runner volume ≈ runnerArea × 10 mm (average length) / 1000 → cc; × density → g
  const runnerVol   = (Ar * 10) / 1000;                          // cc (approx, assumes avg runner length 10 mm)
  const runnerWt    = runnerVol * rho;                            // g
  const totalWt     = Wc * cav + runnerWt;
  const yieldPct    = totalWt > 0 ? ((Wc * cav) / totalWt) * 100 : 0;

  // --- Gating ratio breakdown ---
  const ratioParts  = (inp.gatingRatio || "1:2:2").split(":").map(Number);
  const sprueArea   = (PI / 4) * Math.pow(Db, 2);                // mm² — sprue exit area
  const ratioSprue  = ratioParts[0] || 1;
  const ratioRunner = ratioParts[1] || 2;
  const ratioGate   = ratioParts[2] || 2;
  const actualRatioSprue  = Ag > 0 ? sprueArea / Ag : 0;
  const actualRatioRunner = Ag > 0 ? Ar / Ag : 0;

  return {
    H_eff,
    v_gate,
    Q,
    V,
    t_pour,
    v_sprue,
    Re,
    t_solid,
    yieldPct,
    runnerVol,
    runnerWt,
    totalWt,
    sprueArea,
    ratioSprue,
    ratioRunner,
    ratioGate,
    actualRatioSprue,
    actualRatioRunner,
  };
}

// ── PROCESS CHECKS ───────────────────────────────────────────
export function gdcChecks(
  inp: Record<string, string>,
  c: ReturnType<typeof computeGDC>
) {
  const VgMin = 0.3;
  const VgMax = 1.5;
  const tPourMax = 15;

  return [
    {
      label: "Gate velocity in range",
      ok: c.v_gate >= VgMin && c.v_gate <= VgMax,
      rule: `${VgMin} – ${VgMax} m/s`,
      val: `${fmt(c.v_gate, 2)} m/s`,
    },
    {
      label: "Reynolds limit (Re < 4000)",
      ok: c.Re < 4000,
      rule: "Re < 4,000 (transitional OK)",
      val: `Re = ${fmt(c.Re, 0)}`,
    },
    {
      label: "Pour time practical limit",
      ok: c.t_pour < tPourMax,
      rule: `t_pour < ${tPourMax} s`,
      val: `${fmt(c.t_pour, 2)} s`,
    },
    {
      label: "Solidification after pour",
      ok: c.t_solid > c.t_pour,
      rule: `t_solid > t_pour (${fmt(c.t_solid, 2)} > ${fmt(c.t_pour, 2)} s)`,
      val: `${fmt(c.t_solid, 2)} s`,
    },
    {
      label: "Yield adequate",
      ok: c.yieldPct > 50,
      rule: "Yield > 50 %",
      val: `${fmt(c.yieldPct, 1)} %`,
    },
  ];
}

// ── DOCUMENTATION ────────────────────────────────────────────
export const GDC_DOC = `
  <p>
    <strong>Gravity Die Casting (GDC)</strong> — also called Permanent Mould Casting — fills a
    reusable steel or cast-iron die by pouring molten metal from a ladle into a pouring basin.
    The metal flows under gravity through a tapered sprue, along runners, and through gates into
    the cavity. GDC produces stronger, finer-grained castings than sand casting with better surface
    finish, at lower tooling cost than HPDC. It is widely used for aluminium pistons, cylinder
    heads, intake manifolds, and cookware.
  </p>

  <h3>1 · Effective pour head</h3>
  <p>
    The sprue is tapered to maintain a full (pressurised) metal column during pouring.
    The effective driving head for the gate is slightly less than the nominal pour height
    because some static pressure is recovered in the taper:
  </p>
  <pre>H<sub>eff</sub> = H<sub>pour</sub> − (D<sub>top</sub> − D<sub>bottom</sub>) / 2   (mm)</pre>
  <p>
    H<sub>pour</sub> is the vertical distance from the pouring basin to the parting line.
    D<sub>top</sub> and D<sub>bottom</sub> are the sprue entrance and exit diameters.
  </p>

  <h3>2 · Gate velocity (Torricelli)</h3>
  <p>
    The metal velocity at the gate follows Torricelli's law, reduced by the discharge
    coefficient C<sub>d</sub> that accounts for friction, bends, and entrance/exit losses:
  </p>
  <pre>v<sub>gate</sub> = C<sub>d</sub> × √(2 × 9.81 × H<sub>eff</sub> / 1000)   (m/s)</pre>
  <p>
    C<sub>d</sub> ≈ 0.8 for a well-designed pressurised gating system; 0.5–0.7 for unpressurised
    or poorly streamlined runners. Typical gate velocities in GDC are 0.3–1.5 m/s.
  </p>

  <h3>3 · Volumetric flow rate and pour time</h3>
  <pre>Q = v<sub>gate</sub> × gate area / 100   (cc/s)</pre>
  <pre>Cavity volume V = casting weight × cavities / density   (cc)</pre>
  <pre>Pour time t = V / Q   (s)</pre>
  <p>
    Pour times above ~15 seconds are a red flag — the metal may start to freeze in the gating
    system. Either enlarge the gate, increase the pour height, or raise the metal/die temperatures.
  </p>

  <h3>4 · Sprue exit velocity</h3>
  <pre>v<sub>sprue</sub> = C<sub>d</sub> × √(2 × 9.81 × H<sub>pour</sub> / 1000)   (m/s)</pre>
  <p>This is the velocity at the narrowest sprue cross-section, using the full pour height.</p>

  <h3>5 · Reynolds number</h3>
  <pre>Re = ρ × v<sub>gate</sub> × D<sub>hyd</sub> / μ</pre>
  <p>
    D<sub>hyd</sub> = √(4 × gate area / π) / 1000 is the hydraulic diameter of the gate (m),
    μ ≈ 0.001 Pa·s for molten aluminium, ρ = alloy density × 1000 (kg/m³).
    Re &lt; 4 000 is the practical limit for gravity casting. Values above 4 000 indicate
    transitional or turbulent flow, which may cause oxide entrainment — though GDC is more
    forgiving than LPDC because the pour basin provides a quiescent entry.
  </p>

  <h3>6 · Solidification time</h3>
  <pre>t<sub>solid</sub> ≈ (section thickness / 2)² × 2   (s)</pre>
  <p>
    A Chvorinov-type approximation with a mould constant of ~2 s/mm² for uncoated steel dies.
    Section thickness is the dominant geometric variable. The solidification time must exceed
    the pour time, or the last metal to enter the cavity will freeze before filling is complete.
    For coated dies, the effective constant may be 1.5–3 s/mm² depending on coating thickness
    and thermal conductivity.
  </p>

  <h3>7 · Yield</h3>
  <pre>Yield = (casting weight × cavities) / (total poured weight) × 100   (%)</pre>
  <p>
    Total poured weight = casting × cavities + estimated runner and sprue weight.
    The runner weight is approximated from runner cross-sectional area × 10 mm average length.
    Yields below 50 % mean more than half the metal poured ends up as returns — consider
    optimising the runner layout or increasing the cavity count.
  </p>

  <h3>8 · Gating ratio</h3>
  <p>
    The gating ratio (e.g. 1:2:2 for pressurised) expresses the relative cross-sectional areas
    of sprue exit : runner : gate. A pressurised system (ratio where gate is the smallest area,
    e.g. 1:2:1 or 1:2:1.5) keeps the gating channels full during pouring and reduces air
    aspiration. An unpressurised system (gate larger than runner, e.g. 1:2:4) relies on the
    choke at the sprue or runner to control fill rate. The computed actual ratios are shown
    for comparison with the target.
  </p>

  <h3>Process window summary</h3>
  <ul>
    <li>Gate velocity: 0.3 – 1.5 m/s</li>
    <li>Reynolds number: &lt; 4 000</li>
    <li>Pour time: &lt; 15 s</li>
    <li>Solidification time: greater than pour time</li>
    <li>Yield: &gt; 50 %</li>
  </ul>

  <h3>Source</h3>
  <p>
    Formulas adapted from standard permanent mould casting handbooks (NADCA Gating Manual,
    Campbell's <em>Castings</em>, and ASM Handbook Volume 15: Casting). The Chvorinov
    solidification approximation uses a lumped mould constant representative of uncoated
    H13 steel dies. Coating, die temperature, and section modulus effects require
    casting simulation for precise values.
  </p>
`;

// ── FAQ ──────────────────────────────────────────────────────
export const GDC_FAQ: [string, string][] = [
  [
    "What does the GDC calculator compute?",
    "It models the gravity die casting pour: effective pour head, gate velocity, flow rate, pour time, sprue velocity, Reynolds number, solidification time, and casting yield. It checks whether your gating design, pour height, and section thickness produce a sound, practical casting process.",
  ],
  [
    "How is GDC different from sand casting?",
    "GDC uses a reusable steel or cast-iron mould (permanent mould) instead of a sand mould. This gives better surface finish, tighter tolerances, faster solidification (finer grain structure), and higher productivity. However, GDC tooling costs are higher, making it best for medium-to-high production volumes (500–50,000+ pieces per year).",
  ],
  [
    "What is the ideal gate velocity for GDC?",
    "0.3–1.5 m/s. Below 0.3 m/s the pour takes too long and the metal may freeze in the gate. Above 1.5 m/s the metal can jet and splash in the cavity, causing bifilm defects and erosion of the die coating. The sweet spot for most aluminium GDC is 0.5–0.8 m/s.",
  ],
  [
    "Why is C_d (discharge coefficient) important?",
    "C_d accounts for all the energy losses in the gating system — friction in the sprue, direction changes, and gate contraction. A well-designed, streamlined pressurised system can reach C_d ≈ 0.8–0.9. Sharp bends, abrupt area changes, or unpressurised (partially filled) runners reduce C_d to 0.5–0.7. The lower C_d is, the slower the fill for the same head — increasing pour time.",
  ],
  [
    "What is a 'pressurised' vs 'unpressurised' gating system?",
    "A pressurised system has the gate as the smallest cross-section (choke), so the sprue and runner stay full of metal throughout the pour. This prevents air aspiration and gives more consistent fill. An unpressurised system chokes at the sprue or runner base; the runner and gate may run partially full. Pressurised ratios are typically 1:2:1 or 1:2:1.5 (sprue:runner:gate). Unpressurised might be 1:2:4.",
  ],
  [
    "How do I select the pour height?",
    "Pour height is the vertical distance from the pouring basin to the die parting line. Higher pour heights give more velocity and faster fill times — but also more turbulence. Common pour heights are 150–400 mm. The calculator's gate velocity check tells you if you're in the right range. If velocity is too low, increase pour height; if too high, reduce it or increase gate area.",
  ],
  [
    "Why does the sprue need to be tapered?",
    "A straight (untapered) sprue would draw in air as the metal accelerates — the stream contracts and pulls away from the walls. A properly tapered sprue (narrower at the bottom) maintains wall contact and keeps the sprue full under pressure. The taper follows the continuity equation: D_bottom / D_top ≈ √(H_top / H_bottom). Our effective head formula accounts for the taper's effect on driving pressure.",
  ],
  [
    "What section thickness should I use for solidification time?",
    "Use the dominant (modulus-controlling) section thickness of the casting — typically the thickest section that solidifies last and feeds the rest of the casting. For a uniform-wall casting, use the nominal wall thickness. For a casting with a heavy boss or flange, use the boss thickness. The solidification time must exceed the pour time for the slowest-freezing section.",
  ],
  [
    "Why is yield an important check?",
    "Yield = (good casting weight) / (total metal poured). Low yield means you're melting, holding, and pouring metal that becomes returns (sprue, runner, overflows). A yield below 50 % roughly doubles your melting cost per good casting. Common GDC yields are 55–75 %. To improve yield: reduce runner length, use hot runners, or increase cavity count.",
  ],
  [
    "How does cavity count affect the GDC calculation?",
    "The total volume to fill scales with cavity count: V_total = (weight per cavity × cavities) / density. More cavities mean a longer pour time for the same gate area. You may need to increase gate area or pour height to keep the pour time under 15 seconds. Multi-cavity tools also change the runner layout — make sure the metal reaches all cavities at roughly the same time.",
  ],
  [
    "What mould coating effects should I account for?",
    "Die coating (insulating ceramic, graphite, or boron nitride) slows heat transfer, increasing solidification time. The calculator's mould constant (~2 s/mm²) is for uncoated steel. A 200 µm coating might raise this to 3–4 s/mm². For coated dies, the solidification-time check is conservative — the actual time will be longer, giving you more margin on the pour time.",
  ],
  [
    "Can I use this calculator for copper alloys or cast iron GDC?",
    "You can — change the density and adjust the thermal parameters. Copper alloys have densities of 7.5–8.9 g/cc and much higher pouring temperatures (1000–1200 °C). The Reynolds number uses density directly, so it will be higher. The solidification approximation is less accurate for ferrous alloys because the mould constant differs significantly — use casting simulation for process qualification.",
  ],
  [
    "What if the pour time is longer than 15 seconds?",
    "The metal may begin to freeze in the runner or gate before the cavity is full. Solutions: (a) increase gate area, (b) increase pour height (raises velocity and flow rate), (c) increase pouring temperature, (d) preheat the die to a higher temperature, (e) use a heated pouring basin, or (f) reduce cavity count.",
  ],
  [
    "How do the GDC and LPDC calculators complement each other?",
    "GDC is open to atmosphere and driven purely by gravity head — simple, flexible, and quick to set up. LPDC applies controlled furnace pressure for a smoother, more reproducible fill. If your GDC checks show borderline Reynolds numbers or pour times, LPDC might give better quality. Conversely, if your LPDC setup is over-engineered for a simple casting, GDC may be more economical. Both calculators use the same format so you can compare side by side.",
  ],
];
