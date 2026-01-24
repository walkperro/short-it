import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
let s = fs.readFileSync(file, "utf8");

// Helper: replace any `clientId: ga_client_id,` with `clientId: ga_client_id,` stays,
// but we ensure ga_client_id is defined in each relevant block and that sends are gated.

// ------------------------------
// A) checkout.session.completed
// ------------------------------
// Insert ga_client_id compute right after customerId is set in checkout block
// and gate GA send with `if (ga_client_id) { ... }`
s = s.replace(
  /const customerId = session\.customer\?\.\s*toString\(\)\s*\?\?\s*null;\s*\n([\s\S]*?)\/\/ ✅ GA event \(non-blocking\)\s*\n\s*if \(customerId\) \{\s*\n\s*await sendGAEvent\(\{\s*\n\s*clientId:\s*customerId,\s*/m,
  (match, between) => {
    // In your current code, this block might already exist but using customerId or ga_client_id.
    // We'll rewrite the GA section cleanly.
    const replacement = `const customerId = session.customer?.toString() ?? null;
${between}// ✅ GA event (non-blocking)
      try {
        const ga_client_id = await pickGaClientId({ customerId });
        if (ga_client_id) {
          await sendGAEvent({
            clientId: ga_client_id,
`;
    return replacement;
  },
);

// If previous regex didn't match (because your GA block already uses ga_client_id),
// do a second targeted replacement: change `if (customerId) { await sendGAEvent({ clientId: ga_client_id,`
// into the guarded version.
s = s.replace(
  /\/\/ ✅ GA event \(non-blocking\)\s*\n\s*if \(customerId\) \{\s*\n\s*await sendGAEvent\(\{\s*\n\s*clientId:\s*ga_client_id,\s*/m,
  `// ✅ GA event (non-blocking)
      try {
        const ga_client_id = await pickGAClientId({ customerId });
        if (ga_client_id) {
          await sendGAEvent({
            clientId: ga_client_id,
`,
);

// Close the try/if block if we opened it above but it's not closed.
// We’ll patch the end of that GA event block by replacing the first `});\n      }\n` after it with `});\n        }\n      } catch {}\n`
s = s.replace(
  /await sendGAEvent\(\{\s*[\s\S]*?\}\);\s*\n\s*\}\s*\n\s*\n\s*return NextResponse\.json\(\{ received: true \}\);\s*/m,
  (m) => {
    // Ensure it ends with our try/catch closure before returning
    // Only adjust if it doesn't already contain `catch`
    if (m.includes("catch")) return m;
    return m.replace(
      /\}\);\s*\n\s*\}\s*\n\s*\n\s*return /m,
      `});\n        }\n      } catch {}\n\n      return `,
    );
  },
);

// ------------------------------
// B) subscription created/updated/deleted block
// ------------------------------

// Insert ga_client_id compute after customerId in subscription block (once)
if (
  !s.includes("const ga_client_id = await pickGaClientId({ sub, customerId")
) {
  s = s.replace(
    /const customerId = sub\.customer\?\.\s*toString\(\)\s*\?\?\s*null;\s*\n/m,
    (m) =>
      m +
      `\n      const ga_client_id = await pickGaClientId({ sub, customerId });\n`,
  );
}

// Gate the GA section: replace `if (customerId) {` with `if (ga_client_id) {`
// ONLY within the "✅ GA events" try block.
s = s.replace(
  /\/\/ ✅ GA events \(non-blocking\)\s*\n\s*try \{\s*\n\s*if \(customerId\) \{\s*\n/m,
  `// ✅ GA events (non-blocking)
      try {
        if (ga_client_id) {
`,
);

// Replace all remaining `clientId: ga_client_id,` is fine once ga_client_id exists.
// But in case there are some `clientId: customerId,` we keep them as-is (don’t change).

// ------------------------------
// C) Final sanity: remove any remaining `clientId: ga_client_id` outside of blocks
// by ensuring the identifier exists. We'll add a harmless fallback at top-level if needed.
// ------------------------------
if (
  s.includes("clientId: ga_client_id") &&
  !s.includes("function pickGaClientId")
) {
  // If helpers weren't inserted (unlikely), we can't fix safely.
  throw new Error("pickGaClientId helper not found — cannot safely patch.");
}

fs.writeFileSync(file, s);
console.log("[DONE] fixed remaining webhook ga_client_id references");
