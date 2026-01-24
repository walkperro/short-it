import fs from "node:fs";

const file = "src/app/api/me/plan/route.ts";
let s = fs.readFileSync(file, "utf8");

// 1) Ensure "not logged in" includes profile:null
s = s.replace(
  /if\s*\(!user\)\s*return\s*NextResponse\.json\(\{\s*plan:\s*"free",\s*is_admin:\s*false,\s*user:\s*null\s*\}\);/m,
  `if (!user) return NextResponse.json({ plan: "free", is_admin: false, user: null, profile: null });`,
);

// 2) Remove "admin overrides plan to 'admin'" so real plan is returned
// Replace the block that sets is_admin then sets plan="admin" for admins.
s = s.replace(
  /const\s+is_admin\s*=\s*isAdminEmail\(email\)\s*\|\|\s*Boolean\(profile\?\.\s*is_admin\);\s*[\s\S]*?const\s+plan\s*=\s*is_admin\s*\?\s*"admin"\s*:\s*\(profile\?\.plan\s*\?\?\s*"free"\);\s*/m,
  `const is_admin = isAdminEmail(email) || Boolean(profile?.is_admin);

// Always return the real subscription plan; keep is_admin separate for access/unlock
const plan = (profile?.plan ?? "free");
`,
);

fs.writeFileSync(file, s, "utf8");
console.log("✅ Patched /api/me/plan: real plan + separate is_admin");
