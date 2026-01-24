import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
let s = fs.readFileSync(file, "utf8");

const before = 'name: "subscription_created"';
let changed = 0;

// Only change the first occurrence in checkout.session.completed block by targeting event_source
s = s.replace(
  /name:\s*"subscription_created",([\s\S]*?)event_source:\s*"checkout\.session\.completed"/m,
  (m) => {
    changed++;
    return m.replace(before, 'name: "checkout_completed"');
  },
);

fs.writeFileSync(file, s);
console.log(
  changed
    ? "[DONE] deduped checkout -> checkout_completed"
    : "[OK] no change applied (already deduped?)",
);
