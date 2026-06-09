// src/tools/posts.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";

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
// Shared mutable post fields — accepted by both posts_add and posts_edit.
// Mirrors the Ghost Admin API post resource:
// https://ghost.org/docs/admin-api/#the-post-object
const tagRef = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    slug: z.string().optional(),
    name: z.string().optional(),
  }),
]);
const authorRef = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    slug: z.string().optional(),
    email: z.string().optional(),
  }),
]);
const postMutableFields = {
  html: z.string().optional(),
  lexical: z.string().optional(),
  status: z.string().optional(),
  slug: z.string().optional(),
  visibility: z.string().optional(),
  featured: z.boolean().optional(),
  email_only: z.boolean().optional(),
  published_at: z.string().optional(),
  custom_excerpt: z.string().optional(),
  feature_image: z.string().optional(),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
  codeinjection_head: z.string().optional(),
  codeinjection_foot: z.string().optional(),
  canonical_url: z.string().optional(),
  tags: z.array(tagRef).optional(),
  authors: z.array(authorRef).optional(),
};
// Email send-control fields. Unlike postMutableFields, these are Ghost Admin API
// QUERY parameters, not post body fields. They control whether a post is sent as
// email to newsletter subscribers when it transitions to published, and to which
// subscriber segment. The handlers forward them via the SDK's queryParams argument,
// never in the post body. See https://docs.ghost.org/admin-api/posts/sending-a-post
const emailSendParams = {
  newsletter: z.string().optional().describe(
    "Slug of the newsletter to send this post as email when it transitions to published (e.g. 'default-newsletter'). When omitted, no email is sent."
  ),
  email_segment: z.string().optional().describe(
    "NQL filter limiting which subscribers receive the email (e.g. 'all', 'status:free', 'status:-free', 'label:vip'). Requires newsletter to be set. Defaults to 'all' on the Ghost side."
  ),
};
const addParams = {
  title: z.string(),
  ...postMutableFields,
  ...emailSendParams,
};
const editParams = {
  id: z.string(),
  updated_at: z.string(),
  title: z.string().optional(),
  ...postMutableFields,
  ...emailSendParams,
};
const deleteParams = {
  id: z.string(),
};

export function registerPostTools(server: McpServer) {
  // Browse posts
  server.tool(
    "posts_browse",
    browseParams,
    async (args, _extra) => {
      const posts = await ghostApiClient.posts.browse(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(posts, null, 2),
          },
        ],
      };
    }
  );

  // Read post
  server.tool(
    "posts_read",
    readParams,
    async (args, _extra) => {
      const post = await ghostApiClient.posts.read(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(post, null, 2),
          },
        ],
      };
    }
  );

  // Add post
  server.tool(
    "posts_add",
    addParams,
    async (args, _extra) => {
      // newsletter + email_segment are Ghost query params, not post body fields:
      // keep them out of the body and forward them via the SDK's queryParams arg.
      const { newsletter, email_segment, ...postData } = args;
      const options: Record<string, string> = {};
      // If html is present, use source: "html" so Ghost uses the html content
      if (postData.html) options.source = "html";
      if (newsletter) options.newsletter = newsletter;
      if (email_segment) options.email_segment = email_segment;
      const post = await ghostApiClient.posts.add(
        postData,
        Object.keys(options).length > 0 ? options : undefined
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(post, null, 2),
          },
        ],
      };
    }
  );

  // Edit post
  server.tool(
    "posts_edit",
    editParams,
    async (args, _extra) => {
      // newsletter + email_segment are Ghost query params, not post body fields:
      // keep them out of the body and forward them via the SDK's queryParams arg.
      // This is what fires the subscriber post-as-email on the draft to published
      // transition. See https://docs.ghost.org/admin-api/posts/sending-a-post
      const { newsletter, email_segment, ...postData } = args;
      const options: Record<string, string> = {};
      // If html is present, use source: "html" so Ghost uses the html content for updates
      if (postData.html) options.source = "html";
      if (newsletter) options.newsletter = newsletter;
      if (email_segment) options.email_segment = email_segment;
      const post = await ghostApiClient.posts.edit(
        postData,
        Object.keys(options).length > 0 ? options : undefined
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(post, null, 2),
          },
        ],
      };
    }
  );

  // Delete post
  server.tool(
    "posts_delete",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.posts.delete(args);
      return {
        content: [
          {
            type: "text",
            text: `Post with id ${args.id} deleted.`,
          },
        ],
      };
    }
  );
}