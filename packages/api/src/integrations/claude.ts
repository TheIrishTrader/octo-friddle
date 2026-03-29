import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function analyzeImage(
  imageUrl: string,
  prompt: string,
): Promise<string> {
  const claude = getClaudeClient();

  // Handle both regular URLs and base64 data URLs from file uploads
  const isBase64 = imageUrl.startsWith("data:");
  const imageContent: Anthropic.ImageBlockParam = isBase64
    ? {
        type: "image",
        source: {
          type: "base64",
          media_type: imageUrl.split(";")[0]!.split(":")[1]! as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: imageUrl.split(",")[1]!,
        },
      }
    : {
        type: "image",
        source: { type: "url", url: imageUrl },
      };

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          imageContent,
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}
