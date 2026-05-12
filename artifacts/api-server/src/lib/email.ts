import { logger } from "./logger.js";

type InvitationEmail = {
  to: string;
  link: string;
  courseTitle: string;
  courseCode: string;
  inviterName: string;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getGmailAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken =
    process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? "depl " + process.env.WEB_REPL_RENEWAL
        : null;
  if (!hostname || !xReplitToken) {
    throw new Error("Gmail integration not configured (missing REPLIT_CONNECTORS_HOSTNAME or identity token)");
  }
  const url = `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=google-mail`;
  const r = await fetch(url, { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } as any });
  if (!r.ok) throw new Error(`Connector lookup failed: ${r.status}`);
  const data: any = await r.json();
  const conn = data?.items?.[0];
  const accessToken: string | undefined =
    conn?.settings?.access_token ?? conn?.settings?.oauth?.credentials?.access_token;
  if (!accessToken) throw new Error("Gmail is not connected. Please connect the Gmail integration in Replit.");
  const expiresInMs = (conn?.settings?.expires_in ?? 3000) * 1000;
  cachedToken = { accessToken, expiresAt: Date.now() + expiresInMs };
  return accessToken;
}

function buildRawMessage(opts: { to: string; from: string; subject: string; html: string; text: string }): string {
  const boundary = "ncst_" + Math.random().toString(36).slice(2);
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    opts.text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    opts.html,
    "",
    `--${boundary}--`,
    "",
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendInvitationEmail(opts: InvitationEmail): Promise<void> {
  const accessToken = await getGmailAccessToken();

  const subject = `You've been invited to ${opts.courseTitle} on NCST LMS`;
  const text = `Hello,

${opts.inviterName} has invited you to join the course "${opts.courseTitle}"${opts.courseCode ? ` (${opts.courseCode})` : ""} on the NCST Learning Management System.

Accept your invitation here:
${opts.link}

This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.

— NCST LMS`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:24px 28px;background:#0f172a;color:#fff">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">NCST LMS</div>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:600">You've been invited to a course</h1>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
        <strong>${escapeHtml(opts.inviterName)}</strong> has invited you to join
        <strong>${escapeHtml(opts.courseTitle)}</strong>${opts.courseCode ? ` <span style="color:#64748b;font-family:monospace;font-size:13px">(${escapeHtml(opts.courseCode)})</span>` : ""}
        on the NCST Learning Management System.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.55">
        Click the button below to accept and access your course materials.
      </p>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${opts.link}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
          Accept invitation
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
        Or paste this link into your browser:<br>
        <a href="${opts.link}" style="color:#475569;word-break:break-all">${opts.link}</a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="margin:0;font-size:12px;color:#94a3b8">
        This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
  </div>
</body></html>`;

  const raw = buildRawMessage({ to: opts.to, from: "me", subject, html, text });

  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!sendRes.ok) {
    const body = await sendRes.text();
    logger.error({ status: sendRes.status, body }, "Gmail send failed");
    throw new Error(`Gmail API error ${sendRes.status}: ${body.slice(0, 200)}`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type SubmissionDecisionEmail = {
  to: string;
  studentName: string;
  courseTitle: string;
  slotTitle: string;
  decision: "rejected" | "revision_requested";
  reviewerName: string;
  reviewComment?: string | null;
};

/**
 * Notify a student that their submission was rejected or needs revision.
 * For now this is a console-only stub — real SMTP/Gmail wiring will land
 * once the user provides their Office 365 credentials.
 */
export async function sendSubmissionDecisionEmail(opts: SubmissionDecisionEmail): Promise<void> {
  const verb = opts.decision === "rejected" ? "REJECTED" : "REVISION REQUESTED";
  logger.info(
    {
      to: opts.to,
      student: opts.studentName,
      course: opts.courseTitle,
      slot: opts.slotTitle,
      decision: opts.decision,
      reviewer: opts.reviewerName,
      comment: opts.reviewComment ?? null,
    },
    `[email-stub] Would email ${opts.to}: submission ${verb} for "${opts.slotTitle}" in ${opts.courseTitle}`,
  );
}
