import { useState } from "react";
import { md5, sha256, bcrypt, argon2id } from "hash-wasm";
import { zxcvbn, fmtTime, card, btn, cell } from "./lib";

const COMMON = ["123456", "password", "12345678", "qwerty", "123456789", "12345", "1234567", "iloveyou", "admin", "welcome",
  "monkey", "dragon", "letmein", "football", "abc123", "password1", "password123", "sunshine", "princess", "master"];

const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const mkSalt = (on) => {
  const bytes = on ? crypto.getRandomValues(new Uint8Array(16)) : new Uint8Array(16);
  return { bytes, hex: on ? hex(bytes) : "" };
};

// gpu = approx. guesses/sec of an RTX 4090-class cracking rig (public hashcat-style figures, illustrative)
const ALGOS = {
  MD5: { type: "Fast hash ❌", gpu: 1.6e11, iters: 3000, table: true, run: (p, s) => md5(s.hex + p) },
  "SHA-256": { type: "Fast hash ❌", gpu: 2.2e10, iters: 3000, table: true, run: (p, s) => sha256(s.hex + p) },
  "bcrypt (cost 12)": {
    type: "Slow KDF ✅", gpu: 1.4e3, iters: 2,
    run: (p, s) => bcrypt({ password: p, salt: s.bytes, costFactor: 12, outputType: "encoded" }),
  },
  "Argon2id (64 MB, t=3)": {
    type: "Memory-hard KDF ✅✅", gpu: 1e3, iters: 2,
    run: (p, s) => argon2id({ password: p, salt: s.bytes, parallelism: 1, iterations: 3, memorySize: 65536, hashLength: 32, outputType: "encoded" }),
  },
};

const barStyle = (sec) => {
  const w = Math.max(3, Math.min(100, ((Math.log10(Math.max(sec, 1e-3)) + 3) / 18) * 100));
  const color = sec < 3600 ? "#ef4444" : sec < 3.15e7 ? "#f97316" : sec < 3.15e9 ? "#eab308" : "#22c55e";
  return { height: 8, borderRadius: 4, width: `${w}%`, background: color };
};

export default function HashLab({ pw }) {
  const demoPw = pw || "password123";
  const guesses = Number(zxcvbn(demoPw).guesses);
  const [algo, setAlgo] = useState("SHA-256");
  const [salted, setSalted] = useState(false);
  const [demo, setDemo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ms, setMs] = useState(null);
  const [benching, setBenching] = useState(false);

  async function runDemo() {
    setBusy(true);
    const A = ALGOS[algo];
    const sa = mkSalt(salted), sb = mkSalt(salted);
    const ha = await A.run(demoPw, sa);
    const hb = await A.run(demoPw, sb);
    let rainbow = null;
    if (A.table) {
      const none = mkSalt(false);
      const table = {};
      for (const p of COMMON) table[await A.run(p, none)] = p;
      rainbow = { found: table[ha] ?? null, size: COMMON.length };
    }
    setDemo({ sa, sb, ha, hb, rainbow, salted });
    setBusy(false);
  }

  async function bench() {
    setBenching(true);
    const out = {};
    for (const [name, A] of Object.entries(ALGOS)) {
      const s = mkSalt(true);
      const t0 = performance.now();
      for (let i = 0; i < A.iters; i++) await A.run("benchmark" + i, s);
      out[name] = (performance.now() - t0) / A.iters;
    }
    setMs(out);
    setBenching(false);
  }

  return (
    <>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>🧂 Salting demo: two users, same password</h3>
        <p style={{ color: "#9ca3af", marginTop: 0 }}>
          Testing password: <b style={{ color: "#fff" }}>{demoPw}</b> {!pw && "(default, type your own above)"}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={algo} onChange={(e) => setAlgo(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
            {Object.keys(ALGOS).map((a) => <option key={a}>{a}</option>)}
          </select>
          <button onClick={() => setSalted(false)} style={{ ...btn, background: !salted ? "#ef4444" : "#232c4f" }}>No salt</button>
          <button onClick={() => setSalted(true)} style={{ ...btn, background: salted ? "#22c55e" : "#232c4f" }}>Random salt per user</button>
          <button onClick={runDemo} disabled={busy} style={btn}>{busy ? "Hashing..." : "▶ Run"}</button>
        </div>

        {demo && (
          <div style={{ marginTop: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={cell}>User</th><th style={cell}>Salt</th><th style={cell}>Stored in database</th></tr></thead>
              <tbody>
                {[["alice", demo.sa, demo.ha], ["bob", demo.sb, demo.hb]].map(([u, s, h]) => (
                  <tr key={u}>
                    <td style={cell}>{u}</td>
                    <td style={{ ...cell, fontFamily: "monospace" }}>{demo.salted ? s.hex.slice(0, 12) + "…" : "none"}</td>
                    <td style={{ ...cell, fontFamily: "monospace", wordBreak: "break-all" }}>{h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              {demo.ha === demo.hb
                ? <b style={{ color: "#ef4444" }}>⚠️ Identical hashes: cracking one user cracks everyone with this password.</b>
                : <b style={{ color: "#22c55e" }}>✅ Different hashes: each user must be attacked separately.</b>}
            </p>
            {demo.rainbow ? (
              <p>
                🌈 Rainbow-table lookup ({demo.rainbow.size} precomputed common passwords, unsalted):{" "}
                {demo.rainbow.found
                  ? <b style={{ color: "#ef4444" }}>CRACKED instantly → "{demo.rainbow.found}"</b>
                  : <b style={{ color: "#22c55e" }}>no match</b>}
                <br />
                <small style={{ color: "#9ca3af" }}>Real rainbow tables hold billions of entries. Salt makes every precomputed table useless.</small>
              </p>
            ) : (
              <p style={{ color: "#9ca3af" }}>Rainbow tables aren't practical against slow hashes: precomputing is as expensive as cracking.</p>
            )}
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>⚔️ Algorithm showdown: how long does YOUR password survive?</h3>
        <p style={{ color: "#9ca3af", marginTop: 0 }}>
          Guesses an attacker needs (zxcvbn): <b style={{ color: "#fff" }}>{guesses.toExponential(2)}</b> ÷ speed of a GPU cracking rig.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cell}>Algorithm</th><th style={cell}>Type</th>
              <th style={cell}>Rig speed (est.)</th><th style={cell}>Time to crack</th>
              <th style={cell}>This device</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ALGOS).map(([name, A]) => {
              const sec = guesses / A.gpu;
              return (
                <tr key={name}>
                  <td style={cell}><b>{name}</b></td>
                  <td style={cell}>{A.type}</td>
                  <td style={cell}>{A.gpu.toExponential(1)} H/s</td>
                  <td style={{ ...cell, minWidth: 180 }}>
                    <div>{fmtTime(sec)}</div>
                    <div style={{ background: "#232c4f", borderRadius: 4, marginTop: 4 }}><div style={barStyle(sec)} /></div>
                  </td>
                  <td style={cell}>{ms ? `${ms[name] < 1 ? ms[name].toFixed(4) : ms[name].toFixed(0)} ms/hash` : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={bench} disabled={benching} style={{ ...btn, marginTop: 12 }}>
          {benching ? "Benchmarking..." : "⏱ Benchmark on this device"}
        </button>
        <p style={{ color: "#9ca3af", fontSize: 13 }}>
          Rig speeds are approximate public benchmark figures (RTX 4090-class) for illustration. The "This device" column is measured live in your browser.
        </p>
      </div>
    </>
  );
}