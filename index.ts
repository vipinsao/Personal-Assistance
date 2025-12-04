import { ChatGroq } from "@langchain/groq";
import { createEventTool, getEventsTool } from "./tools";
import {
  END,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { AIMessage } from "@langchain/core/messages";
import readline from "readline/promises";
import { threadId } from "worker_threads";
const tools = [createEventTool, getEventsTool];

const model = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
}).bindTools(tools);

/**
 * Assistant Node
 */
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

/**
 * Tool Node
 */
const toolNode = new ToolNode(tools);

/**
 * Conditional Edge Function
 */
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
}

/**
 * Create Edges
 */
const graph = new StateGraph(MessagesAnnotation)
  .addNode("assistant", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "assistant")
  .addEdge("tools", "assistant")
  .addConditionalEdges("assistant", shouldContinue, {
    __end__: END,
    tools: "tools",
  });

//memory added
const checkpointer = new MemorySaver();

const app = graph.compile({ checkpointer });

async function main() {
  let config = { configurable: { thread_id: "1" } };

  //creating a terminal ui
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const userInput = await rl.question("You: ");
    if (userInput === "/bye" || userInput === "/exit") break;
    const result = await app.invoke(
      {
        messages: [
          {
            role: "user",
            content: userInput,
          },
        ],
      },
      config
    );
    console.log("AI:", result.messages[result.messages.length - 1]?.content);
  }
  rl.close();
}

main();
