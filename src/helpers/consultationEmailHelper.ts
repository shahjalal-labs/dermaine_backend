import { Consultation } from "@prisma/client";

export interface ConsultationEmailData {
  consultation: Consultation;
  user: {
    fullName: string;
    email: string;
    phoneNumber?: string | null;
  };
  organizerName?: string;
  organizerEmail?: string;
}

// Helper to format Date into iCalendar UTC string format: YYYYMMDDTHHmmssZ
const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

// Escape special characters for ICS format
const escapeICS = (str: string): string => {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
};

/**
 * Generate iCalendar (.ics) format string
 */
export const generateConsultationICS = (data: ConsultationEmailData): string => {
  const { consultation, user, organizerName = "Dermaine Consultation Team", organizerEmail } = data;
  const startDate = new Date(consultation.scheduledAt);
  const durationMinutes = consultation.consultationType === "THIRTY_MINUTES" ? 30 : 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();

  const defaultOrganizerEmail = organizerEmail || process.env.MICROSOFT_CALENDAR_USER || "consultations@dermaine.com";
  const isTeams = consultation.consultationMode === "TEAMS";
  const userPhone = user.phoneNumber || "Registered Phone Number";

  const location = isTeams
    ? (consultation.teamsJoinUrl || "Microsoft Teams Meeting")
    : `Phone Call (${userPhone})`;

  const descriptionLines = [
    `Dermaine Scheduled Consultation`,
    `Mode: ${isTeams ? "Microsoft Teams Video Call" : "Phone Call"}`,
    `Duration: ${durationMinutes} minutes`,
  ];

  if (isTeams) {
    if (consultation.teamsJoinUrl) descriptionLines.push(`Join Meeting: ${consultation.teamsJoinUrl}`);
    if (consultation.teamsMeetingId) descriptionLines.push(`Meeting ID: ${consultation.teamsMeetingId}`);
  } else {
    descriptionLines.push(`Client Phone Number: ${userPhone}`);
    descriptionLines.push(`Info: Our consultant will call you directly at this phone number.`);
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dermaine//Consultation Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:consultation-${consultation.id}@dermaine.com`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICS(`Dermaine Consultation (${user.fullName})`)}`,
    `DESCRIPTION:${escapeICS(descriptionLines.join("\n"))}`,
    `LOCATION:${escapeICS(location)}`,
    `ORGANIZER;CN="${escapeICS(organizerName)}":mailto:${defaultOrganizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN="${escapeICS(user.fullName)}":mailto:${user.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

/**
 * Generate Google Calendar add-event URL
 */
export const getGoogleCalendarUrl = (data: ConsultationEmailData): string => {
  const { consultation, user } = data;
  const startDate = new Date(consultation.scheduledAt);
  const durationMinutes = consultation.consultationType === "THIRTY_MINUTES" ? 30 : 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const startISO = formatICSDate(startDate);
  const endISO = formatICSDate(endDate);

  const isTeams = consultation.consultationMode === "TEAMS";
  const userPhone = user.phoneNumber || "Registered Phone Number";

  const title = `Dermaine Consultation (${durationMinutes} mins)`;
  const location = isTeams ? (consultation.teamsJoinUrl || "Microsoft Teams") : `Phone Call (${userPhone})`;
  const details = isTeams
    ? `Scheduled Consultation with Dermaine.\nMode: Microsoft Teams\nAttendee: ${user.fullName} (${user.email})\n${consultation.teamsJoinUrl ? `Join Link: ${consultation.teamsJoinUrl}` : ""}`
    : `Scheduled Phone Consultation with Dermaine.\nMode: Phone Call\nAttendee: ${user.fullName} (${user.email})\nPhone Number: ${userPhone}\nNote: Consultant will call you at this number.`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startISO}/${endISO}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
};

/**
 * Generate Outlook Calendar add-event URL
 */
export const getOutlookCalendarUrl = (data: ConsultationEmailData): string => {
  const { consultation, user } = data;
  const startDate = new Date(consultation.scheduledAt);
  const durationMinutes = consultation.consultationType === "THIRTY_MINUTES" ? 30 : 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const isTeams = consultation.consultationMode === "TEAMS";
  const userPhone = user.phoneNumber || "Registered Phone Number";

  const title = `Dermaine Consultation (${durationMinutes} mins)`;
  const location = isTeams ? (consultation.teamsJoinUrl || "Microsoft Teams") : `Phone Call (${userPhone})`;
  const details = isTeams
    ? `Scheduled Consultation with Dermaine.\nMode: Microsoft Teams\nAttendee: ${user.fullName} (${user.email})\n${consultation.teamsJoinUrl ? `Join Link: ${consultation.teamsJoinUrl}` : ""}`
    : `Scheduled Phone Consultation with Dermaine.\nMode: Phone Call\nAttendee: ${user.fullName} (${user.email})\nPhone Number: ${userPhone}\nNote: Consultant will call you at this number.`;

  return `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${encodeURIComponent(startISO)}&enddt=${encodeURIComponent(endISO)}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
};

/**
 * Generate HTML Email Body for 24-Hour Reminder
 */
export const generateConsultationEmailHTML = (data: ConsultationEmailData): string => {
  const { consultation, user, organizerName = "Dermaine Consultation Team", organizerEmail } = data;
  const startDate = new Date(consultation.scheduledAt);
  const durationMinutes = consultation.consultationType === "THIRTY_MINUTES" ? 30 : 60;
  const defaultOrganizerEmail = organizerEmail || process.env.MICROSOFT_CALENDAR_USER || "consultations@dermaine.com";

  const isTeams = consultation.consultationMode === "TEAMS";
  const userPhone = user.phoneNumber || "Registered Phone Number";

  // Date formatting
  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const formattedTime = startDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "UTC",
  });

  const googleCalUrl = getGoogleCalendarUrl(data);
  const outlookCalUrl = getOutlookCalendarUrl(data);

  const meetingId = consultation.teamsMeetingId || "N/A";
  const passcode = "Included in Direct Join Link";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consultation Reminder - Dermaine</title>
  <style>
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 620px;
      margin: 30px auto;
      background: #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
      border: 1px solid #334155;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header p {
      color: #e0e7ff;
      margin: 8px 0 0 0;
      font-size: 14px;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 18px;
      color: #f8fafc;
      margin-bottom: 16px;
    }
    .badge {
      display: inline-block;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.4);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .card-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .info-grid {
      display: table;
      width: 100%;
    }
    .info-row {
      display: table-row;
    }
    .info-label {
      display: table-cell;
      padding: 8px 12px 8px 0;
      color: #94a3b8;
      font-size: 14px;
      width: 35%;
      vertical-align: top;
    }
    .info-value {
      display: table-cell;
      padding: 8px 0;
      color: #f1f5f9;
      font-size: 14px;
      font-weight: 500;
      vertical-align: top;
    }
    .btn-teams {
      display: block;
      width: 100%;
      text-align: center;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      padding: 14px 20px;
      border-radius: 10px;
      margin: 20px 0;
      box-sizing: border-box;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .btn-teams:hover {
      background: #1d4ed8;
    }
    .btn-cal {
      display: inline-block;
      flex: 1;
      text-align: center;
      background: #334155;
      color: #cbd5e1 !important;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #475569;
    }
    .btn-cal:hover {
      background: #475569;
      color: #ffffff !important;
    }
    .ics-note {
      font-size: 12px;
      color: #64748b;
      margin-top: 12px;
      text-align: center;
    }
    .footer {
      background: #0f172a;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>DERMAINE</h1>
      <p>Upcoming Consultation Reminder</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${user.fullName},</div>
      <span class="badge">⏰ 24-HOUR REMINDER</span>
      <p style="color: #cbd5e1; margin-bottom: 24px;">
        This is a reminder that your scheduled consultation with <strong>Dermaine</strong> is happening tomorrow. Please review your appointment details below:
      </p>

      <div class="card">
        <div class="card-title">📅 Consultation Details</div>
        <div class="info-grid">
          <div class="info-row">
            <div class="info-label">Date & Time</div>
            <div class="info-value"><strong>${formattedDate}</strong><br>${formattedTime}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Duration</div>
            <div class="info-value">${durationMinutes} Minutes</div>
          </div>
          <div class="info-row">
            <div class="info-label">Mode</div>
            <div class="info-value">${isTeams ? "Microsoft Teams Video Call" : "Phone Call"}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Organizer</div>
            <div class="info-value">${organizerName} (${defaultOrganizerEmail})</div>
          </div>
        </div>
      </div>

      ${
        isTeams
          ? `
      <div class="card" style="border-color: #3b82f6;">
        <div class="card-title" style="color: #60a5fa;">💻 Microsoft Teams Meeting</div>
        ${
          consultation.teamsJoinUrl
            ? `<a href="${consultation.teamsJoinUrl}" target="_blank" class="btn-teams">🚀 Join Teams Meeting Now</a>`
            : `<p style="color: #94a3b8;">Join link will be provided prior to the meeting.</p>`
        }
        <div class="info-grid">
          <div class="info-row">
            <div class="info-label">Meeting ID</div>
            <div class="info-value"><code>${meetingId}</code></div>
          </div>
          <div class="info-row">
            <div class="info-label">Passcode</div>
            <div class="info-value"><code>${passcode}</code></div>
          </div>
        </div>
      </div>
      `
          : `
      <div class="card" style="border-color: #10b981;">
        <div class="card-title" style="color: #34d399;">📞 Phone Consultation Details</div>
        <div class="info-grid">
          <div class="info-row">
            <div class="info-label">Contact Phone</div>
            <div class="info-value"><strong>${userPhone}</strong></div>
          </div>
          <div class="info-row">
            <div class="info-label">Instructions</div>
            <div class="info-value">Our consultant will call you directly at your phone number (<code>${userPhone}</code>) at the scheduled time.</div>
          </div>
        </div>
      </div>
      `
      }

      <div class="card">
        <div class="card-title">📆 Add to Your Calendar</div>
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 12px 0;">Quickly sync this consultation to your personal calendar:</p>
        <div style="text-align: center;">
          <a href="${googleCalUrl}" target="_blank" class="btn-cal" style="margin-right: 8px;">Google Calendar</a>
          <a href="${outlookCalUrl}" target="_blank" class="btn-cal">Outlook / Office 365</a>
        </div>
        <div class="ics-note">📎 A calendar invitation file (<code>invite.ics</code>) is also attached to this email for Apple Calendar and Desktop Outlook.</div>
      </div>

      <p style="color: #94a3b8; font-size: 13px;">If you have any questions or need to reschedule, please contact our support team prior to your consultation time.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Dermaine. All rights reserved.<br>
      Automated consultation reminder sent by Dermaine Backend Service.
    </div>
  </div>
</body>
</html>
  `;
};
