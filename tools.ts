import { tool } from "@langchain/core/tools";
import { google } from "googleapis";
import tokens from "./tokens.json";
import z from "zod";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

oauth2Client.setCredentials(tokens);

export const createEventTool = tool(
  //query is passed by llm itself not by us
  async ({}) => {
    //Google calendar logic goes here
    return "The meeting has been created";
  },
  {
    name: "create-event",
    description: "Call to create the calendar events",
    schema: z.object({
      query: z
        .string()
        .describe("The query to be used to create event into google calendar."),
    }),
  }
);

type params = {
  query: string;
  timeMin: string;
  timeMax: string;
};

export const getEventsTool = tool(
  //query is passed by llm itself not by us
  async (params) => {
    /**
     * timeMin
     * timeMax
     * q
     */

    console.log("params", params);
    const { query, timeMin, timeMax } = params as params;
    try {
      const response = await calendar.events.list({
        calendarId: "primary",
        q: query,
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
    schema: z.object({
      query: z
        .string()
        .describe(
          "The query to be used to get events from google calendar. It can be one of these values: meeting, summary, description, location, attendees display name, attendees email, organiser's name, organiser's email or meetings or something see all the calendar details"
        ),
      timeMin: z
        .string()
        .describe("The from datetime in UTC format for the event."),
      timeMax: z
        .string()
        .describe("The to datetime in UTC format for the event"),
    }),
  }
);
