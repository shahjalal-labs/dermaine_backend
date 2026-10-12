import { ClientSecretCredential } from "@azure/identity";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

interface CreateTeamsMeetingParams {
  subject: string;
  startDate: Date | string;
  durationMinutes: number;
  attendeeEmail?: string;
}

interface TeamsMeetingResult {
  eventId: string;
  teamsMeetingId: string | null;
  teamsJoinUrl: string | null;
}

const tenantId = process.env.MICROSOFT_TENANT_ID;
const clientId = process.env.MICROSOFT_CLIENT_ID;
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
const calendarUser = process.env.MICROSOFT_CALENDAR_USER;

if (!tenantId || !clientId || !clientSecret || !calendarUser) {
  throw new Error("Microsoft Graph environment variables are not configured");
}

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

const createTeamsMeeting = async ({
  subject,
  startDate,
  durationMinutes,
  attendeeEmail,
}: CreateTeamsMeetingParams): Promise<TeamsMeetingResult> => {
  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid consultation date");
  }

  if (durationMinutes <= 0) {
    throw new Error("Duration must be greater than 0");
  }

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  // Get an application access token from Microsoft Entra ID
  const tokenResponse = await credential.getToken(
    "https://graph.microsoft.com/.default",
  );

  if (!tokenResponse?.token) {
    throw new Error("Failed to obtain Microsoft Graph access token");
  }

  const eventData = {
    subject,
    start: {
      dateTime: start.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "UTC",
    },
    attendees: attendeeEmail
      ? [
          {
            emailAddress: {
              address: attendeeEmail,
            },
            type: "required",
          },
        ]
      : [],

    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
    isReminderOn: true,
    reminderMinutesBeforeStart: 120,
  };

  const response = await fetch(
    `${GRAPH_BASE_URL}/users/${encodeURIComponent(
      calendarUser,
    )}/calendar/events`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify(eventData),
    },
  );

  console.log("Microsoft Graph response status:", response);

  const data = await response.json();

  console.log("Microsoft Graph response data:", data);

  if (!response.ok) {
    console.error("Microsoft Graph error:", data);

    throw new Error(
      data?.error?.message || "Failed to create Microsoft Teams meeting",
    );
  }

  const meetingIdMatch = (data.bodyPreview || data.body?.content || "").match(
    /Meeting ID:\s*([^\r\n<]+)/i,
  );
  const teamsMeetingId = meetingIdMatch
    ? meetingIdMatch[1].trim()
    : (data.onlineMeeting?.id ?? data.id ?? null);

  return {
    eventId: data.id,
    teamsMeetingId,
    teamsJoinUrl:
      data.onlineMeeting?.joinUrl ?? data.onlineMeeting?.joinWebUrl ?? null,
  };
};

export { createTeamsMeeting };
