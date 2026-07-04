import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"

// Enums
export const assetTypeEnum = pgEnum("asset_type", [
  "image",
  "video",
  "audio",
  "document",
  "archive",
  "code",
  "font",
  "other",
])

export const assetVisibilityEnum = pgEnum("asset_visibility", [
  "public", // Visible to everyone
  "authenticated", // Visible to logged-in users
  "committee", // Visible to committee members only
  "admin", // Visible to admins only
  "private", // Visible only to owner
])

export const assetStatusEnum = pgEnum("asset_status", [
  "active",
  "archived",
  "deleted",
  "processing",
])

// Assets table
export const assets = pgTable(
  "assets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Basic Information
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // File Information
    fileUrl: text("file_url").notNull(),
    fileKey: text("file_key"), // R2 key or Cloudinary public_id
    fileType: varchar("file_type", { length: 100 }), // MIME type
    fileSize: integer("file_size"), // in bytes
    assetType: assetTypeEnum("asset_type").notNull(),

    // Storage Information
    storageProvider: varchar("storage_provider", { length: 50 }), // cloudinary, r2
    thumbnailUrl: text("thumbnail_url"),
    previewUrl: text("preview_url"),

    // Metadata
    dimensions: jsonb("dimensions").$type<{
      width?: number
      height?: number
      duration?: number // for videos/audio
    }>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    // Categorization
    category: varchar("category", { length: 100 }), // contract, design, media, etc.
    tags: jsonb("tags").$type<string[]>().default([]),

    // Project Association (optional)
    projectId: text("project_id"), // references projects.id

    // Ownership & Permissions
    uploadedBy: text("uploaded_by"), // user ID
    visibility: assetVisibilityEnum("visibility")
      .default("committee")
      .notNull(),
    status: assetStatusEnum("status").default("active").notNull(),

    // Usage Tracking
    downloadCount: integer("download_count").default(0),
    viewCount: integer("view_count").default(0),
    lastAccessedAt: timestamp("last_accessed_at"),

    // SEO & Search
    alt: text("alt"), // Alt text for images
    caption: text("caption"),
    searchableContent: text("searchable_content"), // For full-text search

    // Versioning
    version: integer("version").default(1),
    parentAssetId: text("parent_asset_id"), // For versions

    // Flags
    isFeatured: boolean("is_featured").default(false),
    isPinned: boolean("is_pinned").default(false),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    nameIdx: index("asset_name_idx").on(table.name),
    typeIdx: index("asset_type_idx").on(table.assetType),
    categoryIdx: index("asset_category_idx").on(table.category),
    projectIdx: index("asset_project_idx").on(table.projectId),
    uploadedByIdx: index("asset_uploaded_by_idx").on(table.uploadedBy),
    visibilityIdx: index("asset_visibility_idx").on(table.visibility),
    statusIdx: index("asset_status_idx").on(table.status),
    createdAtIdx: index("asset_created_at_idx").on(table.createdAt),
    searchIdx: index("asset_search_idx").on(table.searchableContent),
  })
)

// Asset Collections (for grouping assets)
export const assetCollections = pgTable(
  "asset_collections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 255 }).unique(),
    thumbnailUrl: text("thumbnail_url"),

    // Project Association (optional)
    projectId: text("project_id"),

    // Ownership & Permissions
    createdBy: text("created_by"),
    visibility: assetVisibilityEnum("visibility")
      .default("committee")
      .notNull(),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    // Flags
    isFeatured: boolean("is_featured").default(false),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("collection_name_idx").on(table.name),
    slugIdx: index("collection_slug_idx").on(table.slug),
    projectIdx: index("collection_project_idx").on(table.projectId),
    createdByIdx: index("collection_created_by_idx").on(table.createdBy),
  })
)

// Asset to Collection mapping (many-to-many)
export const assetsToCollections = pgTable(
  "assets_to_collections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => assetCollections.id, { onDelete: "cascade" }),
    order: integer("order").default(0), // For sorting within collection
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => ({
    assetIdx: index("asset_collection_asset_idx").on(table.assetId),
    collectionIdx: index("asset_collection_collection_idx").on(
      table.collectionId
    ),
  })
)

// Asset Comments
export const assetComments = pgTable(
  "asset_comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    authorId: text("author_id"),
    authorName: varchar("author_name", { length: 255 }),
    parentId: text("parent_id"), // For threaded comments
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    assetIdx: index("asset_comment_asset_idx").on(table.assetId),
    authorIdx: index("asset_comment_author_idx").on(table.authorId),
    parentIdx: index("asset_comment_parent_idx").on(table.parentId),
  })
)

// Relations
export const assetsRelations = relations(assets, ({ one, many }) => ({
  project: one(assets, {
    fields: [assets.projectId],
    references: [assets.id],
  }),
  parentAsset: one(assets, {
    fields: [assets.parentAssetId],
    references: [assets.id],
  }),
  versions: many(assets),
  comments: many(assetComments),
  collections: many(assetsToCollections),
}))

export const assetCollectionsRelations = relations(
  assetCollections,
  ({ many }) => ({
    assets: many(assetsToCollections),
  })
)

export const assetsToCollectionsRelations = relations(
  assetsToCollections,
  ({ one }) => ({
    asset: one(assets, {
      fields: [assetsToCollections.assetId],
      references: [assets.id],
    }),
    collection: one(assetCollections, {
      fields: [assetsToCollections.collectionId],
      references: [assetCollections.id],
    }),
  })
)

// Schemas for validation
export const insertAssetSchema = createInsertSchema(assets)
export const selectAssetSchema = createSelectSchema(assets)

export const insertAssetCollectionSchema = createInsertSchema(assetCollections)
export const selectAssetCollectionSchema = createSelectSchema(assetCollections)

export const insertAssetCommentSchema = createInsertSchema(assetComments)
export const selectAssetCommentSchema = createSelectSchema(assetComments)

// Type exports
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type AssetCollection = typeof assetCollections.$inferSelect
export type NewAssetCollection = typeof assetCollections.$inferInsert
export type AssetComment = typeof assetComments.$inferSelect
export type NewAssetComment = typeof assetComments.$inferInsert
export type AssetType = z.infer<typeof assetTypeEnum>
export type AssetVisibility = z.infer<typeof assetVisibilityEnum>
export type AssetStatus = z.infer<typeof assetStatusEnum>
