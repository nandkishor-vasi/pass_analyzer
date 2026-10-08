import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as common from "@zxcvbn-ts/language-common";
import * as en from "@zxcvbn-ts/language-en";

zxcvbnOptions.setOptions({
  translations: en.translations,
  graphs: common.adjacencyGraphs,
  dictionary: { ...common.dictionary, ...en.dictionary },
});

export { zxcvbn };

export async function sha1(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export async function breachCount(pw) {
  const hash = await sha1(pw);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith(hash.slice(5)));
  return line ? parseInt(line.split(":")[1]) : 0;
}

export function fmtTime(s) {
  if (s < 1e-3) return "instantly";
  if (s < 1) return "less than a second";
  const units = [["second", 60], ["minute", 60], ["hour", 24], ["day", 365], ["year", 100], ["century", Infinity]];
  let v = s;
  for (const [name, div] of units) {
    if (v < div) {
      const n = Math.round(v);
      return `${n > 1e9 ? v.toExponential(1) : n.toLocaleString()} ${name}${n === 1 ? "" : "s"}`;
    }
    v /= div;
  }
}

export const card = { background: "#141b34", border: "1px solid #232c4f", borderRadius: 14, padding: 20, marginTop: 16 };
export const btn = { padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: "#6366f1", color: "#fff", fontWeight: 600 };
export const cell = { padding: "8px 10px", borderBottom: "1px solid #232c4f", textAlign: "left", fontSize: 14 };