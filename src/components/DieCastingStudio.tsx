"use client";

import { useState } from "react";
import PQ2App from "./PQ2Calculator";
import LPDCCalc from "./processes/LPDCCalc";
import GDCCalc from "./processes/GDCCalc";
import VacuumCalc from "./processes/VacuumCalc";
import SqueezeCalc from "./processes/SqueezeCalc";
import SSMCalc from "./processes/SSMCalc";

const PROCESSES = [
  { id: "hpdc", label: "HPDC", desc: "High Pressure Die Casting" },
  { id: "lpdc", label: "LPDC", desc: "Low Pressure Die Casting" },
  { id: "gdc", label: "GDC", desc: "Gravity Die Casting" },
  { id: "vacuum", label: "Vac-HPDC", desc: "Vacuum HPDC" },
  { id: "squeeze", label: "Squeeze", desc: "Squeeze Casting" },
  { id: "ssm", label: "SSM", desc: "Semi-Solid / Rheocasting" },
] as const;

type ProcessId = (typeof PROCESSES)[number]["id"];

const processStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#ff7a1a" : "#1d2026",
  color: active ? "#15171b" : "#9aa0ab",
  border: "1px solid " + (active ? "#ff7a1a" : "#2b2f37"),
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "center",
  whiteSpace: "nowrap",
  transition: "all 0.15s",
});

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 9.5,
  fontWeight: 400,
  color: "#7d838e",
  marginTop: 1,
  letterSpacing: "0.04em",
};

export default function DieCastingStudio() {
  const [process, setProcess] = useState<ProcessId>("hpdc");

  return (
    <div style={{ minHeight: "100vh", background: "#15171b" }}>
      {/* Process selector bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#0d0f13",
          borderBottom: "1px solid #1f2229",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ marginRight: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "#ff7a1a", fontWeight: 700, marginBottom: 2 }}>
            DIE CASTING PROCESS STUDIO
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e8e6e1", lineHeight: 1 }}>
            CastCalc
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PROCESSES.map((p) => (
            <button
              key={p.id}
              onClick={() => setProcess(p.id)}
              style={processStyle(process === p.id)}
            >
              {p.label}
              <span style={labelStyle}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Process content */}
      <div>
        {process === "hpdc" && <PQ2App />}
        {process === "lpdc" && <LPDCCalc />}
        {process === "gdc" && <GDCCalc />}
        {process === "vacuum" && <VacuumCalc />}
        {process === "squeeze" && <SqueezeCalc />}
        {process === "ssm" && <SSMCalc />}
      </div>

      {/* Global footer */}
      <div style={{ textAlign: "center", padding: "20px 16px 30px", borderTop: "1px solid #1f2229" }}>
        <div style={{ fontSize: 11, color: "#6e7480" }}>
          Die casting process design tools · HPDC | LPDC | GDC | Vacuum HPDC | Squeeze Casting | Semi-Solid / Rheocasting
        </div>
        <div style={{ fontSize: 11, color: "#555a63", marginTop: 4 }}>
          Design &amp; developed by{" "}
          <a href="https://skmudassir.in" target="_blank" rel="noopener noreferrer" style={{ color: "#7d838e" }}>
            Mudassir Shaik
          </a>{" "}
          (skmudassir.in)
        </div>
      </div>
    </div>
  );
}
