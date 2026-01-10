import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type SendShortItEmailArgs = {
  email: string;
  plan: string;
  level: string;
  dashboardUrl: string;
  billingUrl?: string;
};

export async function sendShortItAccessEmail({
  email,
  plan,
  level,
  dashboardUrl,
  billingUrl,
}: SendShortItEmailArgs) {
  return resend.emails.send({
    from: "Short-It Trade Intel <access@short-it.trade>",
    to: email,
    subject: `Short-It Access Activated — ${plan} (${level})`,
    html: `
<div style="background:#0a0a0a;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
  <div style="max-width:560px;margin:0 auto;background:#111111;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.08);">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:14px;letter-spacing:2px;color:#888;">SHORT-IT</div>
      <div style="font-size:11px;letter-spacing:3px;color:#555;">TRADE INTEL</div>
    </div>

    <h1 style="font-size:22px;font-weight:600;text-align:center;">You’re in.</h1>

    <p style="font-size:14px;color:#ccc;text-align:center;">
      Your <strong>${plan}</strong> access is now live.
    </p>

    <div style="background:#0d0d0d;border-radius:12px;padding:20px;border:1px solid rgba(255,255,255,0.06);margin:24px 0;">
      <div style="font-size:12px;color:#888;">SUBSCRIPTION</div>
      <div style="font-size:18px;font-weight:600;">
        ${plan} <span style="color:#888;font-size:13px;">(${level})</span>
      </div>
    </div>

    <a href="${dashboardUrl}" style="display:block;text-align:center;background:#ffffff;color:#000;padding:14px;border-radius:12px;font-weight:600;text-decoration:none;">
      Open Short-It Dashboard
    </a>

    <p style="font-size:12px;color:#888;margin-top:24px;">
      Manage billing anytime:
      <br />
      <a href="${billingUrl ?? dashboardUrl}" style="color:#fff;">Manage Subscription</a>
    </p>

    <p style="font-size:11px;color:#666;margin-top:28px;">
      Stripe receipts are sent separately.
    </p>
  </div>
</div>
    `,
  });
}
