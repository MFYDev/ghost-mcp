import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";

const uploadParams = {
  file: z.string().describe("Absolute path to the image file on disk"),
  purpose: z
    .enum(["image", "profile_image", "icon"])
    .optional()
    .describe("Upload purpose; defaults to 'image'"),
  ref: z.string().optional().describe("Optional reference string returned in the response"),
};

export function registerImageTools(server: McpServer) {
  server.tool(
    "images_upload",
    "Upload an image file to Ghost storage. Returns a 'url' field — use that URL as the value for feature_image, og_image, twitter_image, or src attributes in HTML content when creating or editing posts and pages. Images must be uploaded before a post referencing them is published.",
    uploadParams,
    async (args, _extra) => {
      const result = await ghostApiClient.images.upload(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
