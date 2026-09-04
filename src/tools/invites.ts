// src/tools/invites.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toInviteSummary } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
};
const addParams = {
  role_id: z.string(),
  email: z.string(),
};
const deleteParams = {
  id: z.string(),
};

export function registerInviteTools(server: McpServer) {
  // Browse invites
  server.tool(
    "invites_browse",
    "List pending staff invites as compact summaries (id, email, role_id, status, created_at). Check pagination.next for more pages.",
    browseParams,
    async (args, _extra) => {
      const { items, meta } = await ghostApiClient.invites.browse(args);
      return textResult(browseEnvelope(items.map(toInviteSummary), meta));
    }
  );

  // Add invite
  server.tool(
    "invites_add",
    "Invite a staff user by email and role_id (look up role ids with roles_browse). Returns a minimal confirmation {id,email,status}.",
    addParams,
    async (args, _extra) => {
      const invite = await ghostApiClient.invites.add(args);
      return textResult(toConfirmation(invite));
    }
  );

  // Delete invite
  server.tool(
    "invites_delete",
    "Revoke a pending staff invite by id.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.invites.delete(args);
      return textResult(`Invite with id ${args.id} deleted.`);
    }
  );
}
