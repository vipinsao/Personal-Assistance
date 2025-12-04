import { tool } from "@langchain/core/tools";
import { google } from "googleapis";
import z from "zod";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

oauth2Client.setCredentials({
  access_token: process.env.GOOGLE_ACCESS_TOKEN,
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

type attendee = {
  email: string;
  displayName: string;
};

const eventDataSchema = z.object({
  summary: z.string().describe("The title of the event"),
  start: z.object({
    dateTime: z.string().describe("The date time of start of the event"),
    timeZone: z.string().describe("Current IANA timezone string"),
  }),
  end: z.object({
    dateTime: z.string().describe("The date time of end of the event"),
    timeZone: z.string().describe("Current IANA timezone string"),
  }),
  attendees: z.array(
    z.object({
      email: z.string().describe("The email of the attendee"),
      displayName: z.string().describe("The name of the attendee"),
    })
  ),
});

type EventData = z.infer<typeof eventDataSchema>;

// type EventData = {
//   query: string;
//   summary: string;
//   start: {
//     dateTime: string;
//     timeZone: string;
//   };
//   end: {
//     dateTime: string;
//     timeZone: string;
//   };
//   attendees: attendee[];
// };

export const createEventTool = tool(
  //query is passed by llm itself not by us
  async (eventData) => {
    const { summary, start, end, attendees } = eventData as EventData;

    //Google calendar logic goes here
    const response = await calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        start,
        end,
        attendees,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      },
    });

    if (response.statusText === "OK") {
      return "The meeting has been created.";
    }

    return "Couldn't create a meeting.";
  },
  {
    name: "create-event",
    description: "Call to create the calendar events",
    schema: eventDataSchema,
  }
);

const getEventSchema = z.object({
  query: z.string().describe(
    //   "The query to be used to get events from google calendar. It can be one of these values: meeting, interview, summary, description, location, attendees display name, attendees email, organiser's name, organiser's email or meetings or something see all the calendar details"
    "There must be any meeting or event analyze the calendar correctly."
  ),
  timeMin: z
    .string()
    .describe("The from datetime in IANA format to get the event."),
  timeMax: z
    .string()
    .describe("The to datetime in IANA format to get the event"),
});

type params = z.infer<typeof getEventSchema>;

// type params = {
//   query: string;
//   timeMin: string;
//   timeMax: string;
// };

export const getEventsTool = tool(
  //query is passed by llm itself not by us
  async (params) => {
    /**
     * timeMin
     * timeMax
     * q(query)
     */
    const { query, timeMin, timeMax } = params as params;
    try {
      const response = await calendar.events.list({
        calendarId: "primary",
        // q: query,
        timeMin,
        timeMax,
      });
      const result = response.data.items?.map((event) => {
        return {
          id: event.id,
          summary: event.summary,
          status: event.status,
          organizer: event.organizer,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
          meetLink: event.hangoutLink,
          eventType: event.eventType,
        };
      });
      return JSON.stringify(result);
    } catch (error) {
      console.log(error);
    }
    return "Falied to connect with calendar tool :(";
  },
  {
    name: "get-events",
    description: "Call to get the calendar events",
    schema: getEventSchema,
  }
);
