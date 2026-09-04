// src/tools/roles.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toRoleSummary } from "../utils/summaries";
import { textResult, browseEnvelope } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
};
const readParams = {
  id: z.string().optional(),
  name: z.string().optional(),
};

export function registerRoleTools(server: McpServer) {
  // Browse roles
  server.tool(
    "roles_browse",
    "List roles as compact summaries (id, name, description). Use roles_read with an id or name for full detail.",
    browseParams,
    async (args, _extra) => {
      const { items, meta } = await ghostApiClient.roles.browse(args);
      return textResult(browseEnvelope(items.map(toRoleSummary), meta));
    }
  );

  // Read role
  server.tool(
    "roles_read",
    "Fetch one role by id or name.",
    readParams,
    async (args, _extra) => {
      const role = await ghostApiClient.roles.read(args);
      return textResult(role);
    }
  );
}
