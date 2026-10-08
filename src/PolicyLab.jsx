import { useState, useEffect } from "react";
import { zxcvbn, breachCount, fmtTime, card, cell } from "./lib";

const SAMPLES = ["password", "Password1!", "P@ssw0rd2024!", "Summer2024!", "Qwerty123!", "iloveyou", "Tr0ub4dor&3",
  "lantern-frozen-orbit-pickle", "purple monkey dishwasher cactus", "tiger-lamp-ocean-velvet-mango", "xK9#mQ2$vL7!pR4n"];

// each check returns a list of reasons for failing; empty list = pass
const POLICIES = [
  {
    id: "legacy", name: "Legacy corporate (LUDS)", rule: "≥ 8 chars + upper + lower + digit + symbol",
    check: (p) => {
      const w = [];
      if (p.length < 8) w.push("under 8 chars");
      if (!/[A-Z]/.test(p)) w.push("no uppercase");
      if (!/[a-z]/.test(p)) w.push("no lowercase");
      if (!/\d/.test(p)) w.push("no digit");
      if (!/[^A-Za-z0-9]/.test(p)) w.push("no symbol");
      return w;
    },
  },
  {
    id: "nist", name: "NIST SP 800-63B style", rule: "≥ 15 chars + not in breach lists, no composition rules",
    check: (p, c) => {
      const w = [];
      if (p.length < 15) w.push("under 15 chars");
      if (c.breach > 0) w.push(`breached ${c.breach.toLocaleString()}x`);
      return w;
    },
  },
  {
    id: "hybrid", name: "PassLab Hybrid (ours)", rule: "≥ 12 chars + zxcvbn score ≥ 3 + not breached",
    check: (p, c) => {
      const w = [];
      if (p.length < 12) w.push("under 12 chars");
      if (c.score < 3) w.push(`zxcvbn score ${c.score}/4`);
      if (c.breach > 0) w.push(`breached ${c.breach.toLocaleString()}x`);
      return w;
    },
  },
];

export default function PolicyLab({ pw }) {
  const [breach, setBreach] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const out = {};
      await Promise.all(SAMPLES.map(async (p) => {
        try { out[p] = await breachCount(p); } catch { out[p] = 0; }
      }));
      if (alive) setBreach((b) => ({ ...b, ...out }));
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!pw) return;
    let alive = true;
    const t = setTimeout(async () => {
      try { const c = await breachCount(pw); if (alive) setBreach((b) => ({ ...b, [pw]: c })); } catch { /* offline */ }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [pw]);

  const rows = [...(pw ? [pw] : []), ...SAMPLES.filter((s) => s !== pw)].map((p) => {
    const r = zxcvbn(p);
    const c = { score: r.score, breach: breach[p] ?? 0 };
    const res = {};
    POLICIES.forEach((pol) => (res[pol.id] = pol.check(p, c)));
    return { p, r, strong: r.score >= 3 && c.breach === 0, res, live: p === pw };
  });

  return (
    <>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>📜 Three policies, same passwords</h3>
        {POLICIES.map((pol) => (
          <p key={pol.id} style={{ margin: "6px 0" }}><b>{pol.name}:</b> <span style={{ color: "#9ca3af" }}>{pol.rule}</span></p>
        ))}
      </div>

      <div style={{ ...card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cell}>Password</th>
              <th style={cell}>Cracked in (fast hash)</th>
              <th style={cell}>Actually strong?</th>
              {POLICIES.map((p) => <th key={p.id} style={cell}>{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.p}>
                <td style={{ ...cell, fontFamily: "monospace" }}>{row.live && "👉 "}{row.p}</td>
                <td style={cell}>{fmtTime(Number(row.r.guesses) / 1e10)}</td>
                <td style={cell}>{row.strong ? "💪 Yes" : "💀 No"}</td>
                {POLICIES.map((pol) => {
                  const why = row.res[pol.id];
                  const pass = why.length === 0;
                  const bg = pass && !row.strong ? "#7f1d1d" : !pass && row.strong ? "#78350f" : "transparent";
                  return (
                    <td key={pol.id} style={{ ...cell, background: bg }} title={why.join(", ")}>
                      {pass ? "✅ Pass" : "❌ " + why[0]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>
          🟥 red = policy accepted a weak password &nbsp; 🟧 orange = policy rejected a strong password
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {POLICIES.map((pol) => {
          const wrongAccept = rows.filter((r) => r.res[pol.id].length === 0 && !r.strong).length;
          const wrongReject = rows.filter((r) => r.res[pol.id].length > 0 && r.strong).length;
          const acc = Math.round(((rows.length - wrongAccept - wrongReject) / rows.length) * 100);
          return (
            <div key={pol.id} style={card}>
              <h4 style={{ marginTop: 0 }}>{pol.name}</h4>
              <h2 style={{ margin: "4px 0", color: acc > 80 ? "#22c55e" : acc > 60 ? "#eab308" : "#ef4444" }}>{acc}% accurate</h2>
              <p style={{ margin: "4px 0" }}>🟥 Weak accepted: <b>{wrongAccept}</b></p>
              <p style={{ margin: "4px 0" }}>🟧 Strong rejected: <b>{wrongReject}</b></p>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        "Actually strong" = zxcvbn score ≥ 3 and not found in breaches (attacker's-eye view).
      </p>
    </>
  );
}