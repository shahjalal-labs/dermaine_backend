const logoUrl =
  "https://res.cloudinary.com/dbpao5h91/image/upload/v1782888595/ainwsygfaqiw6o2fagvb.png";

const currentYear = new Date().getFullYear();

const buildEmail = ({
  title,
  greeting,
  content,
  cta,
  footerText,
}: {
  title: string;
  greeting?: string;
  content: string;
  cta?: { label: string; href: string };
  footerText: string;
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:linear-gradient(180deg,#eef7f5 0%,#f7fafc 100%);font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.12);border:1px solid #e5eef1;">
            <tr>
              <td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:36px 40px;text-align:center;">
                <img src="${logoUrl}" alt="Dermaine logo" style="height:72px;max-width:220px;object-fit:contain;display:block;margin:0 auto 16px;" />
                <div style="display:inline-block;background:rgba(255,255,255,0.16);color:#ffffff;font-size:12px;letter-spacing:1px;text-transform:uppercase;padding:8px 14px;border-radius:999px;">
                  ${title}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 40px 28px;">
                ${greeting ? `<p style="margin:0 0 14px;font-size:16px;color:#0f172a;">${greeting}</p>` : ""}
                <div style="font-size:16px;line-height:1.7;color:#475569;">${content}</div>
                ${
                  cta
                    ? `
                <p style="text-align:center;margin:34px 0 18px;">
                  <a href="${cta.href}"
                     style="background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:12px;font-size:16px;font-weight:bold;display:inline-block;box-shadow:0 10px 24px rgba(15,118,110,0.25);">
                    ${cta.label}
                  </a>
                </p>
                `
                    : ""
                }
                <div style="margin-top:30px;padding:18px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;font-size:13px;color:#64748b;line-height:1.6;">
                  ${footerText}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 40px 30px;text-align:center;font-size:12px;color:#94a3b8;background:#fbfdfe;border-top:1px solid #e2e8f0;">
                &copy; ${currentYear} Immica. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export const emailBody = (username: string, otp: string) => {
  return buildEmail({
    title: "Sign Up Verification",
    greeting: `Hi <strong>${username}</strong>,`,
    content: `
      <p style="margin:0 0 14px;">Your verification code is:</p>
      <div style="text-align:center;margin:18px 0 16px;">
        <div style="display:inline-block;background:#ecfeff;color:#0f766e;font-size:36px;font-weight:800;letter-spacing:8px;padding:16px 28px;border-radius:16px;border:1px solid #99f6e4;">
          ${otp}
        </div>
      </div>
    `,
    footerText:
      "This OTP is valid for <strong>5 minutes</strong>. If you did not request this, you can safely ignore this email.",
  });
};

export const inviteOrganizationMemberEmailBody = (
  fullName: string,
  role: string,
  organization: string,
  inviteLink: string,
) => {
  return buildEmail({
    title: "Organization Invitation",
    greeting: `Hi <strong>${fullName}</strong>,`,
    content: `
      <p style="margin:0 0 14px;">You have been invited to join <strong>${organization}</strong> as a <strong>Organization ${role}</strong>.</p>
      <p style="margin:0;">Click the button below to complete your registration and activate your account.</p>
    `,
    cta: { label: "Accept Invitation", href: inviteLink },
    footerText:
      "If you weren't expecting this invitation, you can safely ignore this email.",
  });
};

export const inviteOrganizationEmailBody = (
  organization: string,
  inviteLink: string,
) => {
  return buildEmail({
    title: "Organization Setup Invitation",
    greeting: "Hi,",
    content: `
      <p style="margin:0 0 14px;">You have been invited to create and manage <strong>${organization}</strong> as an <strong>Organization Admin</strong>.</p>
      <p style="margin:0;">Click the button below to activate your account and complete your organization's registration.</p>
    `,
    cta: { label: "Activate & Register", href: inviteLink },
    footerText:
      "If you weren't expecting this invitation, you can safely ignore this email.",
  });
};

export const inviteAdminEmailBody = (adminName: string, inviteLink: string) => {
  return buildEmail({
    title: "Admin Invitation",
    greeting: `Hi <strong>${adminName}</strong>,`,
    content: `
      <p style="margin:0 0 14px;">You have been invited to register as an <strong>Admin</strong> for <strong>IMMICA</strong>.</p>
      <p style="margin:0;">Click the button below to activate your account and complete your admin registration.</p>
    `,
    cta: { label: "Activate & Register", href: inviteLink },
    footerText:
      "If you weren't expecting this invitation, you can safely ignore this email.",
  });
};
