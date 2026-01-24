import fs from "fs";

const file = "src/app/api/stripe/checkout/route.ts";
let s = fs.readFileSync(file, "utf8");

// Replace the "existing customer update" block to also write metadata if ga_client_id exists.
s = s.replace(
  /await stripe\.customers\.update\(customerId,\s*\{\s*email:\s*receiptEmail\s*\}\);\s*/m,
  `await stripe.customers.update(customerId, {
        email: receiptEmail,
        ...(ga_client_id ? { metadata: { ga_client_id: String(ga_client_id) } } : {}),
      });
`,
);

fs.writeFileSync(file, s);
console.log(
  "[DONE] patched checkout: customers.update also writes ga_client_id metadata",
);
