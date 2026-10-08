import { useState } from "react";
import Analyzer from "./Analyzer";
import HashLab from "./HashLab";
import PolicyLab from "./PolicyLab";
import { btn } from "./lib";

const TABS = [["analyze", "🔍 Analyzer"], ["hash", "🧂 Hash & Salt Lab"], ["policy", "📜 Policy Lab"]];

export default function App() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState("analyze");

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 4 }}>🔐 PassLab</h1>
      <p style={{ color: "#9ca3af", marginTop: 0 }}>Analyze it. Attack it. Store it right. Set the right policy.</p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type={show ? "text" : "password"}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Type a password to test..."
          style={{ flex: 1, padding: 14, fontSize: 16, borderRadius: 10, border: "1px solid #232c4f", background: "#0f1630", color: "#fff" }}
        />
        <button onClick={() => setShow(!show)} style={{ ...btn, background: "#232c4f" }}>{show ? "Hide" : "Show"}</button>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...btn, background: tab === id ? "#6366f1" : "#232c4f" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "analyze" && <Analyzer pw={pw} />}
      {tab === "hash" && <HashLab pw={pw} />}
      {tab === "policy" && <PolicyLab pw={pw} />}
    </div>
  );
}