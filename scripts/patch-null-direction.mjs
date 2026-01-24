import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "glob";

const files = globSync("src/app/**/*.tsx", { nodir: true });

let changed = 0;

for (const f of files) {
  let s = readFileSync(f, "utf8");
  const before = s;

  // Replace: something.direction.toUpperCase()
  // With: (something.direction ?? something.option_side ?? "—").toUpperCase()
  s = s.replace(
    /(\b[A-Za-z_$][\w$]*)(\?\.)?direction\.toUpperCase\(\)/g,
    (_m, obj) =>
      `(${obj}.direction ?? ${obj}.option_side ?? "—").toUpperCase()`,
  );

  // Replace: something.direction!.toUpperCase() (if any)
  s = s.replace(
    /(\b[A-Za-z_$][\w$]*)\.direction!\.toUpperCase\(\)/g,
    (_m, obj) =>
      `(${obj}.direction ?? ${obj}.option_side ?? "—").toUpperCase()`,
  );

  // Replace: direct "direction.toUpperCase()" (rare)
  s = s.replace(
    /\bdirection\.toUpperCase\(\)/g,
    `(direction ?? option_side ?? "—").toUpperCase()`,
  );

  if (s !== before) {
    writeFileSync(f, s, "utf8");
    changed++;
  }
}

console.log(`✅ Patched ${changed} file(s).`);
