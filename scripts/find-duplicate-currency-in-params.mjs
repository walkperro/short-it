import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
const s = fs.readFileSync(file, "utf8");

function findMatchingBrace(str, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < str.length; i++) {
    const ch = str[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function lineOf(idx) {
  return s.slice(0, idx).split("\n").length;
}

let i = 0;
let hits = 0;

while (true) {
  const p = s.indexOf("params", i);
  if (p === -1) break;

  // find next "{"
  const braceOpen = s.indexOf("{", p);
  if (braceOpen === -1) break;

  const braceClose = findMatchingBrace(s, braceOpen);
  if (braceClose === -1) break;

  const body = s.slice(braceOpen + 1, braceClose);
  const count = (body.match(/\bcurrency\s*:/g) || []).length;

  if (count > 1) {
    hits++;
    const startLine = lineOf(braceOpen);
    const endLine = lineOf(braceClose);
    console.log(
      `[DUP] currency appears ${count}x in params block at lines ~${startLine}-${endLine}`,
    );
    // print a snippet around the params block for easy targeting
    const before = Math.max(1, startLine - 12);
    const after = endLine + 12;
    const lines = s.split("\n");
    for (let ln = before; ln <= after; ln++) {
      const text = lines[ln - 1] ?? "";
      console.log(String(ln).padStart(5, " ") + " | " + text);
    }
    console.log("------------------------------------------------------------");
  }

  i = braceClose + 1;
}

if (!hits) {
  console.log("[OK] No params blocks contain duplicate currency keys.");
}
