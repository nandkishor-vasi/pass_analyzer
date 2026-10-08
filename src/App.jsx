import { useState, useEffect } from "react";
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as common from "@zxcvbn-ts/language-common";
import * as en from "@zxcvbn-ts/language-en";

zxcvbnOptions.setOptions({
  translations: en.translations,
  graphs: common.adjacencyGraphs,
  dictionary: { ...common.dictionary, ...en.dictionary },
});

const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];

async function sha1(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function breachCount(pw) {
  const hash = await sha1(pw);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith(suffix));
  return line ? parseInt(line.split(":")[1]) : 0;
}

const card = {
  background: "#141b34",
  border: "1px solid #232c4f",
  borderRadius: 14,
  padding: 20,
  marginTop: 16,
};

export default function App() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [pwned, setPwned] = useState(null);
  const r = pw ? zxcvbn(pw) : null;

  useEffect(() => {
    setPwned(null);
    if (!pw) return;
    const t = setTimeout(() => {
      breachCount(pw).then(setPwned).catch(() => setPwned(-1));
    }, 500);
    return () => clearTimeout(t);
  }, [pw]);

  return (
    <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 4 }}>🔐 PassLab</h1>
      <p style={{ color: "#9ca3af", marginTop: 0 }}>Password Security Analyzer</p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type={show ? "text" : "password"}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Type a password to analyze..."
          style={{
            flex: 1, padding: 14, fontSize: 16, borderRadius: 10,
            border: "1px solid #232c4f", background: "#0f1630", color: "#fff",
          }}
        />
        <button
          onClick={() => setShow(!show)}
          style={{ padding: "0 16px", borderRadius: 10, border: "none", cursor: "pointer" }}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      {r && (
        <>
          <div style={card}>
            <div style={{ height: 10, background: "#232c4f", borderRadius: 5 }}>
              <div style={{
                height: 10, borderRadius: 5, transition: "all .3s",
                width: `${(r.score + 1) * 20}%`, background: colors[r.score],
              }} />
            </div>
            <h2 style={{ color: colors[r.score], marginBottom: 4 }}>
              {labels[r.score]} ({r.score}/4)
            </h2>
            <p>Guesses needed: <b>{Number(r.guesses).toExponential(2)}</b></p>
            <p>Offline attack (fast hash, 10B/sec): <b>{r.crackTimesDisplay.offlineFastHashing1e10PerSecond}</b></p>
            <p>Online attack (throttled): <b>{r.crackTimesDisplay.onlineThrottling100PerHour}</b></p>
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>🕵️ Breach check (HIBP)</h3>
            {pwned === null && <p>Checking...</p>}
            {pwned === -1 && <p>Could not reach the breach database.</p>}
            {pwned === 0 && <p style={{ color: "#22c55e" }}>Not found in known breaches ✅</p>}
            {pwned > 0 && (
              <p style={{ color: "#ef4444" }}>
                Found in breaches <b>{pwned.toLocaleString()}</b> times ❌
              </p>
            )}
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>🧩 Detected patterns</h3>
            {r.sequence.map((s, i) => (
              <span key={i} style={{
                background: "#232c4f", padding: "6px 10px", margin: 4,
                display: "inline-block", borderRadius: 8,
              }}>
                {s.token} <small style={{ color: "#9ca3af" }}>({s.pattern})</small>
              </span>
            ))}
          </div>

          {(r.feedback.warning || r.feedback.suggestions.length > 0) && (
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>💡 Feedback</h3>
              {r.feedback.warning && <p>⚠️ {r.feedback.warning}</p>}
              {r.feedback.suggestions.map((s, i) => <p key={i}>• {s}</p>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}