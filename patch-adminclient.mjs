import fs from "fs";

const file = "src/app/admin/AdminClient.tsx";
let s = fs.readFileSync(file, "utf8");

// 1) Ensure we have strike/exp state
if (!s.includes("const [strike")) {
  s = s.replace(
    /const \[reach, setReach\] = useState<string>\(""\);\s*/m,
    (m) => m + `const [strike, setStrike] = useState<string>("");\n  const [exp, setExp] = useState<string>("");\n  `
  );
}

// 2) Ensure resetForm resets strike/exp
s = s.replace(
  /setReach\(""\);\s*/m,
  (m) => m + `setStrike("");\n    setExp("");\n    `
);

// 3) Ensure startEdit loads strike/exp
if (!s.includes("setStrike(") || !s.includes("setExp(")) {
  s = s.replace(
    /setReach\(i\.reach == null \? "" : String\(i\.reach\)\);\s*/m,
    (m) =>
      m +
      `    setStrike((i.strike == null ? "" : String(i.strike)));\n    setExp((i.exp == null ? "" : String(i.exp)));\n`
  );
}

// 4) Replace payload block in save()
s = s.replace(
  /const payload = \{\s*status,\s*locked,\s*kind,\s*ticker: ticker\.trim\(\)\.toUpperCase\(\),\s*direction: isOption \? null : direction,\s*entry: toNumberOrNull\(entry\),\s*reach: toNumberOrNull\(reach\),\s*option_side: isOption \? optionSide : null,\s*context: context\.trim\(\),\s*\};/m,
  `const payload = {
      status,
      locked,
      kind,
      ticker: ticker.trim().toUpperCase(),
      direction: isOption ? null : direction,
      entry: toNumberOrNull(entry),
      reach: toNumberOrNull(reach),

      // option-only fields
      option_side: isOption ? optionSide : null,
      strike: isOption ? toNumberOrNull(strike) : null,
      exp: isOption ? (exp.trim() || null) : null,

      context: context.trim(),
    };`
);

// 5) Expand AdminIdea type with strike/exp if missing
if (!s.includes("strike:")) {
  s = s.replace(
    /option_side: "call" \| "put" \| null;\s*context: string \| null;\s*/m,
    (m) => m + `  strike: number | null;\n  exp: string | null;\n`
  );
}

// 6) Add UI fields Strike + Exp (only when isOption)
if (!s.includes('label="Strike (options only)"') && !s.includes('label="Exp (options only)"')) {
  s = s.replace(
    /<Field label="Reach">[\s\S]*?<\/Field>\s*/m,
    (block) =>
      block +
      `
          {/* OPTIONS ONLY: Strike + Exp */}
          <Field label="Strike (options only)">
            <input
              value={strike}
              onChange={(e) => setStrike(e.target.value)}
              inputMode="decimal"
              placeholder="500"
              disabled={!isOption}
              className={[
                "w-full rounded-2xl border px-4 py-3 outline-none",
                !isOption
                  ? "border-white/5 bg-black/20 text-white/30"
                  : "border-white/10 bg-black/40 text-white focus:border-white/20",
              ].join(" ")}
            />
          </Field>

          <Field label="Exp (options only)">
            <input
              type="date"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
              disabled={!isOption}
              className={[
                "w-full rounded-2xl border px-4 py-3 outline-none",
                !isOption
                  ? "border-white/5 bg-black/20 text-white/30"
                  : "border-white/10 bg-black/40 text-white focus:border-white/20",
              ].join(" ")}
            />
          </Field>
`
  );
}

// 7) Make sure Save/Publish buttons are not accidental submit buttons
s = s.replace(/<button(\s+disabled=\{busy\}\s+onClick=\{\(\) => save\("draft"\)\})/g, '<button type="button"$1');
s = s.replace(/<button(\s+disabled=\{busy\}\s+onClick=\{\(\) => save\("published"\)\})/g, '<button type="button"$1');

fs.writeFileSync(file, s);
console.log("Patched AdminClient.tsx ✅");
