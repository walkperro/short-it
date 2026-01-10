import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type SendShortItEmailArgs = {
  email: string;
  plan: string;
  level: string;
  dashboardUrl: string;
  billingUrl?: string;
};

function accessHtml(plan: string, level: string, dashboardUrl: string, billingUrl?: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#ffffff;color:#111;padding:24px">
    <div style="max-width:560px;margin:0 auto">
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:600">
        Short-It account update
      </h2>

      <p style="font-size:14px;line-height:1.6;margin:0 0 12px">
        Your Short-It account access is now active.
      </p>

      <p style="font-size:14px;line-height:1.6;margin:0 0 12px">
        <strong>Active plan:</strong> ${plan} (${level})
      </p>

      <a href="${dashboardUrl}"
         style="display:inline-block;margin-top:16px;padding:10px 14px;
                border-radius:6px;background:#111;color:#fff;
                text-decoration:none;font-size:14px">
        Open dashboard
      </a>

      <p style="font-size:12px;color:#555;margin-top:20px">
        Manage billing: <a href="${billingUrl ?? dashboardUrl}" style="color:#111">Manage subscription</a>
      </p>

      <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb" />

      <p style="font-size:12px;color:#555;margin:0">
        If you did not request this change, you can ignore this email.
      </p>

      <p style="font-size:12px;color:#555;margin-top:6px">
        Short-It Trade Intel
      </p>
    </div>
  </div>
  `;
}

function accessText(plan: string, level: string, dashboardUrl: string, billingUrl?: string) {
  return `
Your Short-It account access is now active.

Active plan: ${plan} (${level})

Dashboard:
${dashboardUrl}

Manage billing:
${billingUrl ?? dashboardUrl}

If you did not request this change, you can ignore this email.

— Short-It Trade Intel
`;
}

export async function sendShortItAccessEmail({
  email,
  plan,
  level,
  dashboardUrl,
  billingUrl,
}: SendShortItEmailArgs) {
  return resend.emails.send({
    from: "Short-It <no-reply@short-it.trade>",
    to: email,
    subject: "Your Short-It account access is active",
    html: accessHtml(plan, level, dashboardUrl, billingUrl),
    text: accessText(plan, level, dashboardUrl, billingUrl),
    headers: {
      "List-Unsubscribe": "<mailto:unsubscribe@short-it.trade>",
    },
  });
}
