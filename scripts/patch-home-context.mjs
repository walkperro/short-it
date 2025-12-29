import fs from "node:fs";

const file = "src/app/page.tsx";
let s = fs.readFileSync(file, "utf8");

// Replace the exact teaser conditional block with context/teaser fallback
const before =
  /{\s*i\.teaser\s*\?\s*\(\s*<p className="mt-2 text-sm text-white\/70 line-clamp-2">\{i\.teaser\}<\/p>\s*\)\s*:\s*null\s*}/m;

const after = `{(i.context ?? i.teaser) ? (
                <p className="mt-2 text-sm text-white/70 line-clamp-2">
                  {(i.context ?? i.teaser) as any}
                </p>
              ) : null}`;

if (!before.test(s)) {
  console.error("❌ Could not find the teaser block to replace in src/app/page.tsx");
  process.exit(1);
}

s = s.replace(before, after);
fs.writeFileSync(file, s, "utf8");
console.log("✅ Updated home page to use (context ?? teaser)");
