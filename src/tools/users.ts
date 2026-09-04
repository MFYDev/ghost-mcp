// src/tools/users.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toUserSummary, DEFAULT_USER_FIELDS } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation, pickFields } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional().describe("Results per page, max 100, default 15"),
  page: z.number().optional(),
  order: z.string().optional(),
  fields: z.string().optional().describe("Comma-separated attributes to return, e.g. 'id,name,email'. Cannot be combined with include."),
  include: z.string().optional().describe("Relations to include: 'roles'. When set, fields is ignored."),
};
const readParams = {
  id: z.string().optional(),
  email: z.string().optional(),
  slug: z.string().optional(),
};
const editParams = {
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  slug: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().optional(),
  location: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  // Add more fields as needed
};
const deleteParams = {
  id: z.string(),
};

export function registerUserTools(server: McpServer) {
  // Browse users
  server.tool(
    "users_browse",
    "List staff users as compact summaries (id, name, email, slug, status, created_at). Use include='roles' for roles or fields= to narrow. Check pagination.next and pass page= to continue.",
    browseParams,
    async (args, _extra) => {
      const { fields, include, ...rest } = args;
      if (include) {
        const { items, meta } = await ghostApiClient.users.browse({ ...rest, include });
        return textResult(browseEnvelope(items.map(toUserSummary), meta));
      }
      const effectiveFields = fields ?? DEFAULT_USER_FIELDS;
      const { items, meta } = await ghostApiClient.users.browse({ ...rest, fields: effectiveFields });
      const fieldList = effectiveFields.split(",");
      return textResult(browseEnvelope(items.map((item: any) => pickFields(item, fieldList)), meta));
    }
  );

  // Read user
  server.tool(
    "users_read",
    "Fetch one staff user by id, email, or slug, with full detail including bio, location, social links, and profile images.",
    readParams,
    async (args, _extra) => {
      const user = await ghostApiClient.users.read(args);
      return textResult(user);
    }
  );

  // Edit user
  server.tool(
    "users_edit",
    "Update an existing staff user by id. Returns a minimal confirmation {id,slug,status,updated_at}.",
    editParams,
    async (args, _extra) => {
      const user = await ghostApiClient.users.edit(args);
      return textResult(toConfirmation(user));
    }
  );

  // Delete user
  server.tool(
    "users_delete",
    "Permanently delete a staff user by id. This cannot be undone.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.users.delete(args);
      return textResult(`User with id ${args.id} deleted.`);
    }
  );
}
