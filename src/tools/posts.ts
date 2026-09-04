// src/tools/posts.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toPostSummary, DEFAULT_POST_FIELDS, POST_READ_FIELDS } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation, pickFields } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional().describe("Ghost NQL filter, e.g. 'status:published+tag:news'"),
  limit: z.number().optional().describe("Results per page, max 100, default 15"),
  page: z.number().optional(),
  order: z.string().optional().describe("e.g. 'published_at desc'"),
  fields: z.string().optional().describe("Comma-separated attributes to return, e.g. 'id,title,status,published_at'. Cannot be combined with include."),
  include: z.string().optional().describe("Relations to include: 'tags', 'authors', or 'tags,authors'. When set, fields is ignored."),
};
const readParams = {
  id: z.string().optional(),
  slug: z.string().optional(),
  content: z
    .enum(["html", "lexical"])
    .optional()
    .describe("Omit for metadata only (default). Pass 'html' or 'lexical' to also return that one content format."),
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
  html: z.string().optional().describe("HTML content for the post. Any <img> src values must be publicly accessible URLs — upload local images via images_upload first and use the returned URL."),
  lexical: z.string().optional(),
  status: z.string().optional().describe("Post status: 'draft', 'published', 'scheduled', or 'sent'. All image URLs referenced in the post must be uploaded and accessible before setting status to 'published'."),
  slug: z.string().optional(),
  visibility: z.string().optional(),
  featured: z.boolean().optional(),
  email_only: z.boolean().optional(),
  published_at: z.string().optional(),
  custom_excerpt: z.string().optional(),
  feature_image: z.string().url().optional().describe("Publicly accessible HTTPS URL of the feature image. Use the URL returned by images_upload for Ghost-hosted images."),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().url().optional().describe("Publicly accessible HTTPS URL for the Open Graph image. Use the URL returned by images_upload for Ghost-hosted images."),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().url().optional().describe("Publicly accessible HTTPS URL for the Twitter card image. Use the URL returned by images_upload for Ghost-hosted images."),
  codeinjection_head: z.string().optional(),
  codeinjection_foot: z.string().optional(),
  canonical_url: z.string().optional(),
  tags: z.array(tagRef).optional(),
  authors: z.array(authorRef).optional(),
};
const addParams = {
  title: z.string(),
  ...postMutableFields,
};
const editParams = {
  id: z.string(),
  updated_at: z.string(),
  title: z.string().optional(),
  ...postMutableFields,
};
const deleteParams = {
  id: z.string(),
};

export function registerPostTools(server: McpServer) {
  // Browse posts
  server.tool(
    "posts_browse",
    "List posts as compact summaries. Default fields: id,title,slug,status,dates,url,excerpt. Use fields= to narrow (e.g. 'id,title,status,published_at' for a content calendar) or include='tags,authors' for relations. Max 100/page; check pagination.next and pass page= to continue.",
    browseParams,
    async (args, _extra) => {
      const { fields, include, ...rest } = args;
      if (include) {
        // include mode: fields must not be sent alongside include, so
        // project client-side via the summary function instead.
        const { items, meta } = await ghostApiClient.posts.browse({ ...rest, include });
        return textResult(browseEnvelope(items.map(toPostSummary), meta));
      }
      const effectiveFields = fields ?? DEFAULT_POST_FIELDS;
      const { items, meta } = await ghostApiClient.posts.browse({ ...rest, fields: effectiveFields });
      const fieldList = effectiveFields.split(",");
      return textResult(browseEnvelope(items.map((item: any) => pickFields(item, fieldList)), meta));
    }
  );

  // Read post
  server.tool(
    "posts_read",
    "Fetch one post by id or slug. Returns metadata only by default; pass content='html' or 'lexical' for the body. Returns updated_at, which posts_edit requires.",
    readParams,
    async (args, _extra) => {
      const { content, ...identifier } = args;
      if (!content) {
        const post = await ghostApiClient.posts.read({ ...identifier, fields: POST_READ_FIELDS });
        return textResult(post);
      }
      const post = await ghostApiClient.posts.read({ ...identifier, formats: content });
      // Ghost may return default content keys regardless of formats; never
      // return more than the one requested format.
      delete post.mobiledoc;
      delete post.plaintext;
      if (content === "html") delete post.lexical;
      else delete post.html;
      return textResult(post);
    }
  );

  // Add post
  server.tool(
    "posts_add",
    "Create a new Ghost post. If the post includes images (feature_image, og_image, twitter_image, or <img> tags in html), upload them first using images_upload and use the returned URLs. Setting status to 'published' immediately makes the post live. Returns a minimal confirmation {id,slug,status,url,updated_at}.",
    addParams,
    async (args, _extra) => {
      // If html is present, use source: "html" to ensure Ghost uses the html content
      const options = args.html ? { source: "html" } : undefined;
      const post = await ghostApiClient.posts.add(args, options);
      return textResult(toConfirmation(post));
    }
  );

  // Edit post
  server.tool(
    "posts_edit",
    "Update an existing Ghost post. Requires the current updated_at timestamp to prevent conflicting edits. If adding or changing images, upload them via images_upload first and use the returned URLs. Changing status to 'published' immediately makes the post live. Returns a minimal confirmation; its updated_at is the value required by the next edit.",
    editParams,
    async (args, _extra) => {
      // If html is present, use source: "html" to ensure Ghost uses the html content for updates
      const options = args.html ? { source: "html" } : undefined;
      const post = await ghostApiClient.posts.edit(args, options);
      return textResult(toConfirmation(post));
    }
  );

  // Delete post
  server.tool(
    "posts_delete",
    "Permanently delete a post by id. This cannot be undone.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.posts.delete(args);
      return textResult(`Post with id ${args.id} deleted.`);
    }
  );
}
