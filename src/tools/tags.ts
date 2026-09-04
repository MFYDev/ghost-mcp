// src/tools/tags.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toTagSummary, DEFAULT_TAG_FIELDS } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation, pickFields } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional().describe("Results per page, max 100, default 15"),
  page: z.number().optional(),
  order: z.string().optional(),
  fields: z.string().optional().describe("Comma-separated attributes to return, e.g. 'id,name,slug'. Cannot be combined with include."),
  include: z.string().optional().describe("Use 'count.posts' to include each tag's post count. When set, fields is ignored."),
};
const readParams = {
  id: z.string().optional(),
  slug: z.string().optional(),
};
const addParams = {
  name: z.string(),
  description: z.string().optional(),
  slug: z.string().optional(),
  // Add more fields as needed
};
const editParams = {
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  slug: z.string().optional(),
  // Add more fields as needed
};
const deleteParams = {
  id: z.string(),
};

export function registerTagTools(server: McpServer) {
  // Browse tags
  server.tool(
    "tags_browse",
    "List tags as compact summaries (id, name, slug, description, created_at). Use include='count.posts' for post counts or fields= to narrow. Max 100/page; check pagination.next and pass page= to continue.",
    browseParams,
    async (args, _extra) => {
      const { fields, include, ...rest } = args;
      if (include) {
        const { items, meta } = await ghostApiClient.tags.browse({ ...rest, include });
        return textResult(
          browseEnvelope(items.map((tag: any) => ({ ...toTagSummary(tag), count: tag.count })), meta)
        );
      }
      const effectiveFields = fields ?? DEFAULT_TAG_FIELDS;
      const { items, meta } = await ghostApiClient.tags.browse({ ...rest, fields: effectiveFields });
      const fieldList = effectiveFields.split(",");
      return textResult(browseEnvelope(items.map((item: any) => pickFields(item, fieldList)), meta));
    }
  );

  // Read tag
  server.tool(
    "tags_read",
    "Fetch one tag by id or slug, with full detail including meta and OG fields.",
    readParams,
    async (args, _extra) => {
      const tag = await ghostApiClient.tags.read(args);
      return textResult(tag);
    }
  );

  // Add tag
  server.tool(
    "tags_add",
    "Create a new tag. Returns a minimal confirmation {id,slug,updated_at}.",
    addParams,
    async (args, _extra) => {
      const tag = await ghostApiClient.tags.add(args);
      return textResult(toConfirmation(tag));
    }
  );

  // Edit tag
  server.tool(
    "tags_edit",
    "Update an existing tag by id. Returns a minimal confirmation {id,slug,updated_at}.",
    editParams,
    async (args, _extra) => {
      const tag = await ghostApiClient.tags.edit(args);
      return textResult(toConfirmation(tag));
    }
  );

  // Delete tag
  server.tool(
    "tags_delete",
    "Permanently delete a tag by id. Posts keep their other tags. This cannot be undone.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.tags.delete(args);
      return textResult(`Tag with id ${args.id} deleted.`);
    }
  );
}
