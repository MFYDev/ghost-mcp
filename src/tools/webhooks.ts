// src/tools/webhooks.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { textResult, toConfirmation } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const addParams = {
  event: z.string(),
  target_url: z.string(),
  name: z.string().optional(),
  secret: z.string().optional(),
  api_version: z.string().optional(),
  integration_id: z.string().optional(), // Required for user-authenticated requests
};
const editParams = {
  id: z.string(),
  event: z.string().optional(),
  target_url: z.string().optional(),
  name: z.string().optional(),
  api_version: z.string().optional(),
};
const deleteParams = {
  id: z.string(),
};

export function registerWebhookTools(server: McpServer) {
  // Add webhook
  server.tool(
    "webhooks_add",
    "Create a webhook for a Ghost event (e.g. 'post.published') targeting a URL. Returns a minimal confirmation {id,updated_at}.",
    addParams,
    async (args, _extra) => {
      const webhook = await ghostApiClient.webhooks.add(args);
      return textResult(toConfirmation(webhook));
    }
  );

  // Edit webhook
  server.tool(
    "webhooks_edit",
    "Update an existing webhook by id. Returns a minimal confirmation {id,updated_at}.",
    editParams,
    async (args, _extra) => {
      const webhook = await ghostApiClient.webhooks.edit(args);
      return textResult(toConfirmation(webhook));
    }
  );

  // Delete webhook
  server.tool(
    "webhooks_delete",
    "Permanently delete a webhook by id.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.webhooks.delete(args);
      return textResult(`Webhook with id ${args.id} deleted.`);
    }
  );
}
