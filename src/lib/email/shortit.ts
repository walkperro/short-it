import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type SendShortItEmailArgs = {
  email: string;
  plan: string;
  level: string;
  dashboardUrl: string;
  billingUrl?: string;
};

function preheader(text: string) {
  // hidden preheader (helps deliverability + improves inbox preview)
  return `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${text}
  </div>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>`;
}

function accessHtml(plan: string, level: string, dashboardUrl: string, billingUrl?: string) {
  const ph = `Your Short-It access is ready. Plan: ${plan} (${level}).`;
  return `
  ${preheader(ph)}
  <div style="margin:0;padding:28px;background:#0b0b0f;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="border:1px solid rgba(255,255,255,.10);border-radius:18px;overflow:hidden;background:rgba(255,255,255,.04);backdrop-filter:blur(12px);">
        <div style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="font-size:11px;letter-spacing:.30em;color:rgba(255,255,255,.55);">SHORT-IT</div>
          <div style="font-size:10px;letter-spacing:.34em;color:rgba(255,255,255,.35);margin-top:2px;">TRADE INTEL</div>
        </div>

        <div style="padding:20px;">
          <h1 style="margin:0 0 10px;font-size:18px;line-height:1.35;font-weight:650;">
            Account access update
          </h1>

          <p style="margin:0 0 12px;font-size:13.5px;line-height:1.65;color:rgba(255,255,255,.78);">
            Your Short-It access is ready.
          </p>

          <div style="margin:14px 0 16px;padding:14px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.25);">
            <div style="font-size:11px;letter-spacing:.12em;color:rgba(255,255,255,.45);">PLAN</div>
            <div style="margin-top:6px;font-size:15px;font-weight:650;color:#fff;">
              ${plan} <span style="font-weight:500;color:rgba(255,255,255,.55);">(${level})</span>
            </div>
          </div>

          <a href="${dashboardUrl}" target="_blank" rel="noopener"
             style="display:inline-block;background:rgba(255,255,255,.92);color:#000;
                    padding:10px 14px;border-radius:999px;font-weight:650;
                    text-decoration:none;font-size:13.5px;">
            Open dashboard
          </a>

          <div style="margin-top:14px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.55);">
            Billing: <a href="${billingUrl ?? dashboardUrl}" style="color:rgba(255,255,255,.9);text-decoration:none;">Manage subscription</a>
          </div>

          <hr style="border:none;border-top:1px solid rgba(255,255,255,.10);margin:18px 0;" />

          <div style="font-size:11px;line-height:1.6;color:rgba(255,255,255,.45);">
            If you didn’t request this, you can ignore this email.
          </div>
        </div>
      </div>

      <div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.35);text-align:center;">
        Sent by Short-It • no-reply@short-it.trade
      </div>
    </div>
  </div>`;
}

function accessText(plan: string, level: string, dashboardUrl: string, billingUrl?: string) {
  return [
    "Short-It account access update",
    "",
    `Your Short-It access is ready.`,
    `Plan: ${plan} (${level})`,
    "",
    `Open dashboard: ${dashboardUrl}`,
    `Manage subscription: ${billingUrl ?? dashboardUrl}`,
    "",
    "If you didn’t request this, you can ignore this email.",
    "",
    "— Short-It Trade Intel",
  ].join("\n");
}

export async function sendShortItAccessEmail({
  email,
  plan,
  level,
  dashboardUrl,
  billingUrl,
}: SendShortItEmailArgs) {
  const from = process.env.RESEND_FROM || "Short-It <no-reply@short-it.trade>";
  const replyTo = process.env.RESEND_REPLY_TO || undefined;

  return resend.emails.send({
    from,
    to: email,
    subject: "Short-It account access update",
    html: accessHtml(plan, level, dashboardUrl, billingUrl),
    text: accessText(plan, level, dashboardUrl, billingUrl),
    ...(replyTo ? { replyTo } : {}),
    headers: {
      // Helps some filters categorize as legit transactional
      "List-Unsubscribe": "<mailto:unsubscribe@short-it.trade>",
      "X-Entity-Ref-ID": "short-it-access",
    },
  });
}
