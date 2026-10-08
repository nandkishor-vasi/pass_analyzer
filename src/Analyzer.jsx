import { useState, useEffect } from "react";
import { zxcvbn, breachCount, card } from "./lib";

const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];

export default function Analyzer({ pw }) {
  const [pwned, setPwned] = useState(null);
  const r = pw ? zxcvbn(pw) : null;

  useEffect(() => {
    setPwned(null);
    if (!pw) return;
    const t = setTimeout(() => breachCount(pw).then(setPwned).catch(() => setPwned(-1)), 500);
    return () => clearTimeout(t);
  }, [pw]);

  if (!r) return <div style={card}>Type a password above to analyze it.</div>;

  return (
    <>
      <div style={card}>
        <div style={{ height: 10, background: "#232c4f", borderRadius: 5 }}>
          <div style={{ height: 10, borderRadius: 5, transition: "all .3s", width: `${(r.score + 1) * 20}%`, background: colors[r.score] }} />
        </div>
        <h2 style={{ color: colors[r.score], marginBottom: 4 }}>{labels[r.score]} ({r.score}/4)</h2>
        <p>Guesses needed: <b>{Number(r.guesses).toExponential(2)}</b></p>
        <p>Offline attack (fast hash, 10B/sec): <b>{r.crackTimesDisplay.offlineFastHashing1e10PerSecond}</b></p>
        <p>Online attack (throttled): <b>{r.crackTimesDisplay.onlineThrottling100PerHour}</b></p>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>🕵️ Breach check (HIBP, k-anonymity)</h3>
        {pwned === null && <p>Checking...</p>}
        {pwned === -1 && <p>Could not reach the breach database.</p>}
        {pwned === 0 && <p style={{ color: "#22c55e" }}>Not found in known breaches ✅</p>}
        {pwned > 0 && <p style={{ color: "#ef4444" }}>Found in breaches <b>{pwned.toLocaleString()}</b> times ❌</p>}
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>🧩 Detected patterns</h3>
        {r.sequence.map((s, i) => (
          <span key={i} style={{ background: "#232c4f", padding: "6px 10px", margin: 4, display: "inline-block", borderRadius: 8 }}>
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
  );
}