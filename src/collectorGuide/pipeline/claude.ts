// The one place the pipeline talks to Claude. Reads ANTHROPIC_API_KEY from the environment.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { GUIDE_MODEL } from "../config";

const client = new Anthropic();

// Sends one request whose answer must match `schema` (enforced by the API's structured outputs).
export async function askStructured<T extends z.ZodType>(
  schema: T,
  system: string,
  userMessage: string
): Promise<z.infer<T>> {
  const response = await client.messages.parse({
    model: GUIDE_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  console.log(`   🔢 ${response.usage.input_tokens} in / ${response.usage.output_tokens} out tokens`);

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined: ${response.stop_details?.explanation ?? "no reason given"}`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude's answer was cut off (max_tokens)");
  }
  if (!response.parsed_output) {
    throw new Error("Claude's answer didn't match the expected format");
  }
  return response.parsed_output as z.infer<T>;
}
