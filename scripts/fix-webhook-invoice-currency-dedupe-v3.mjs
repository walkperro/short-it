import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
let s = fs.readFileSync(file, "utf8");

function findIndexOrThrow(haystack, needle, start = 0) {
  const i = haystack.indexOf(needle, start);
  if (i === -1) throw new Error(`Needle not found: ${needle}`);
  return i;
}

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
  throw new Error("No matching brace found");
}

function removeAllButLastCurrency(objText) {
  // Find ALL occurrences of "currency:" within objText, remove earlier ones.
  // We remove a "currency: <value>[,]" segment. Assumes <value> doesn't contain an unmatched "}".
  const re = /(\bcurrency\s*:\s*)([^,}\n]+)(\s*,?)/g;
  const matches = [];
  let m;
  while ((m = re.exec(objText)) !== null) {
    matches.push({ start: m.index, end: re.lastIndex, text: m[0] });
  }

  if (matches.length <= 1)
    return { changed: false, text: objText, count: matches.length };

  // Keep the last match, remove all previous from the text (from end to start so indexes stay valid)
  let out = objText;
  for (let i = matches.length - 2; i >= 0; i--) {
    const seg = matches[i];
    out = out.slice(0, seg.start) + out.slice(seg.end);
  }

  return { changed: true, text: out, count: matches.length };
}

try {
  // Locate the invoice_paid GA event block
  const nameIdx = findIndexOrThrow(s, 'name: "invoice_paid"');
  const callStart = s.lastIndexOf("await sendGAEvent", nameIdx);
  if (callStart === -1)
    throw new Error("Could not find enclosing await sendGAEvent(...)");

  // Find params: { ... } after the name
  const paramsIdx = findIndexOrThrow(s, "params", nameIdx);
  const braceOpen = findIndexOrThrow(s, "{", paramsIdx);
  const braceClose = findMatchingBrace(s, braceOpen);

  const before = s.slice(0, braceOpen + 1);
  const body = s.slice(braceOpen + 1, braceClose);
  const after = s.slice(braceClose);

  const res = removeAllButLastCurrency(body);

  if (!res.changed) {
    console.log(
      `[WARN] currency occurrences inside invoice_paid params: ${res.count}. Nothing to dedupe.`,
    );
  } else {
    s = before + res.text + after;
    fs.writeFileSync(file, s);
    console.log(
      `[DONE] deduped currency in invoice_paid params (was ${res.count}, kept last)`,
    );
  }
} catch (e) {
  console.log("[ERROR] script failed:", e?.message || e);
  process.exitCode = 1;
}
