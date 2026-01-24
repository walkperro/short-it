import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
let s = fs.readFileSync(file, "utf8");

function dedupeCurrencyInsideInvoicePaid(block) {
  // Find params object body
  const m = block.match(/params:\s*\{\s*([\s\S]*?)\s*\}\s*,?\s*\}\)\s*;/m);
  if (!m) return block;

  const body = m[1];

  // Collect all currency lines
  const currencyLines = body.match(/^\s*currency:\s*.*?,\s*$/gm) || [];
  if (currencyLines.length <= 1) return block;

  // Keep only the last currency line
  const keep = currencyLines[currencyLines.length - 1];

  // Remove ALL currency lines, then re-insert the kept one at the end (before trailing whitespace)
  const bodyNoCurrency = body
    .replace(/^\s*currency:\s*.*?,\s*$/gm, "")
    .trimEnd();

  const newBody = (bodyNoCurrency + "\n              " + keep.trim()).replace(
    /\n{3,}/g,
    "\n\n",
  );

  return block.replace(body, newBody);
}

// Locate the invoice_paid sendGAEvent block
const re =
  /await\s+sendGAEvent\(\{\s*[\s\S]*?name:\s*"invoice_paid"[\s\S]*?\}\);\s*/m;
const match = s.match(re);

if (!match) {
  console.log("[WARN] could not find invoice_paid sendGAEvent block to patch");
} else {
  const original = match[0];
  const patched = dedupeCurrencyInsideInvoicePaid(original);

  if (patched !== original) {
    s = s.replace(original, patched);
    fs.writeFileSync(file, s);
    console.log("[DONE] removed duplicate currency in invoice_paid params");
  } else {
    console.log("[OK] no duplicate currency found (nothing changed)");
  }
}
