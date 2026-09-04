// src/tools/newsletters.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toNewsletterSummary } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
};
const readParams = {
  id: z.string().optional(),
  slug: z.string().optional(),
};
const addParams = {
  name: z.string(),
  description: z.string().optional(),
  sender_reply_to: z.string().optional(),
  status: z.string().optional(),
  subscribe_on_signup: z.boolean().optional(),
  show_header_icon: z.boolean().optional(),
  show_header_title: z.boolean().optional(),
  show_header_name: z.boolean().optional(),
  title_font_category: z.string().optional(),
  title_alignment: z.string().optional(),
  show_feature_image: z.boolean().optional(),
  body_font_category: z.string().optional(),
  show_badge: z.boolean().optional(),
  // Add more fields as needed
};
const editParams = {
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  sender_name: z.string().optional(),
  sender_email: z.string().optional(),
  sender_reply_to: z.string().optional(),
  status: z.string().optional(),
  subscribe_on_signup: z.boolean().optional(),
  sort_order: z.number().optional(),
  header_image: z.string().optional(),
  show_header_icon: z.boolean().optional(),
  show_header_title: z.boolean().optional(),
  title_font_category: z.string().optional(),
  title_alignment: z.string().optional(),
  show_feature_image: z.boolean().optional(),
  body_font_category: z.string().optional(),
  footer_content: z.string().optional(),
  show_badge: z.boolean().optional(),
  show_header_name: z.boolean().optional(),
  // Add more fields as needed
};
const deleteParams = {
  id: z.string(),
};

export function registerNewsletterTools(server: McpServer) {
  // Browse newsletters
  server.tool(
    "newsletters_browse",
    "List newsletters as compact summaries (id, name, status, visibility, subscribe_on_signup, sort_order). Use newsletters_read with an id or slug for sender settings and display options. Check pagination.next for more pages.",
    browseParams,
    async (args, _extra) => {
      const { items, meta } = await ghostApiClient.newsletters.browse(args);
      return textResult(browseEnvelope(items.map(toNewsletterSummary), meta));
    }
  );

  // Read newsletter
  server.tool(
    "newsletters_read",
    "Fetch one newsletter by id or slug, with full detail including sender settings, display options, and font configuration.",
    readParams,
    async (args, _extra) => {
      const newsletter = await ghostApiClient.newsletters.read(args);
      return textResult(newsletter);
    }
  );

  // Add newsletter
  server.tool(
    "newsletters_add",
    "Create a new newsletter. Returns a minimal confirmation {id,slug,status,updated_at}.",
    addParams,
    async (args, _extra) => {
      const newsletter = await ghostApiClient.newsletters.add(args);
      return textResult(toConfirmation(newsletter));
    }
  );

  // Edit newsletter
  server.tool(
    "newsletters_edit",
    "Update an existing newsletter by id. Returns a minimal confirmation {id,slug,status,updated_at}.",
    editParams,
    async (args, _extra) => {
      const newsletter = await ghostApiClient.newsletters.edit(args);
      return textResult(toConfirmation(newsletter));
    }
  );

  // Delete newsletter
  server.tool(
    "newsletters_delete",
    "Permanently delete a newsletter by id. This cannot be undone.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.newsletters.delete(args);
      return textResult(`Newsletter with id ${args.id} deleted.`);
    }
  );
}
