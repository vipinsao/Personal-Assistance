import { tool } from "@langchain/core/tools";
import z from "zod";

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

export const getEventsTool = tool(
  //query is passed by llm itself not by us
  async () => {
    //Google calendar logic goes here
    //Google calendar logic goes here
    return JSON.stringify([
      {
        title: "Meeting with Sao",
        date: "04-12-2025",
        time: "2 PM",
        location: "GMeet",
      },
    ]);
  },
  {
    name: "get-events",
    description: "Call to get the calendar events",
    schema: z.object({
      query: z
        .string()
        .describe("The query to be used to get events from google calendar."),
    }),
  }
);
