import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
let s = fs.readFileSync(file, "utf8");

function findIndexOrThrow(haystack, needle, start = 0) {
  const i = haystack.indexOf(needle, start);
  if (i === -1) throw new Error(`Needle not found: ${needle}`);
  return i;
}

function findMatchingBrace(str, openIndex) {
  // openIndex must be at "{"
  let depth = 0;
  for (let i = openIndex; i < str.length; i++) {
    const ch = str[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("No matching brace found");
}

function dedupeKeyLines(objBody, key) {
  // Remove duplicate "key:" lines, keep the last one.
  const lines = objBody.split("\n");
  const idxs = [];
  const re = new RegExp(`^\\s*${key}\\s*:`);

  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) idxs.push(i);
  }

  if (idxs.length <= 1) return { changed: false, text: objBody };

  const keep = idxs[idxs.length - 1];
  const out = lines
    .filter((_, i) => !idxs.includes(i) || i === keep)
    .join("\n");
  return { changed: true, text: out };
}

let changed = false;

try {
  // Narrow to the invoice_paid sendGAEvent block first
  const nameIdx = findIndexOrThrow(s, 'name: "invoice_paid"');
  // Walk backwards to the nearest "await sendGAEvent"
  const callStart = s.lastIndexOf("await sendGAEvent", nameIdx);
  if (callStart === -1)
    throw new Error("Could not find enclosing await sendGAEvent(...)");

  // Find params: { ... } after nameIdx
  const paramsIdx = findIndexOrThrow(s, "params", nameIdx);
  const braceOpen = findIndexOrThrow(s, "{", paramsIdx);
  const braceClose = findMatchingBrace(s, braceOpen);

  const before = s.slice(0, braceOpen + 1);
  const body = s.slice(braceOpen + 1, braceClose);
  const after = s.slice(braceClose);

  const deduped = dedupeKeyLines(body, "currency");
  if (deduped.changed) {
    s = before + deduped.text + after;
    changed = true;
    fs.writeFileSync(file, s);
    console.log(
      "[DONE] removed duplicate currency in invoice_paid params (v2)",
    );
  } else {
    console.log(
      "[WARN] invoice_paid params found, but currency did not appear duplicated inside params",
    );
  }
} catch (e) {
  console.log("[ERROR] fix script failed:", e?.message || e);
  process.exitCode = 1;
}

if (!changed) {
  // Helpful debug: show nearby lines around the TS error location if present
  const lines = s.split("\n");
  const approx = 328; // user-reported line
  const start = Math.max(0, approx - 15);
  const end = Math.min(lines.length, approx + 10);
  console.log("\n[DEBUG] Showing around line ~328 for manual inspection:");
  for (let i = start; i < end; i++) {
    console.log(String(i + 1).padStart(4, " ") + " | " + lines[i]);
  }
}
