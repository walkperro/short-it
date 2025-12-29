export function adminAllowlist() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  const allow = adminAllowlist();
  return !!email && allow.includes(email.toLowerCase());
}
