import {
  boolean,
  text,
  primaryKey,
  vector,
  index,
  pgEnum,
  timestamp,
  uuid,
  pgTable,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const indexes = pgTable("indexes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  coverImageUrl: text("cover_image_url").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  shareableId: uuid("shareable_id").defaultRandom().notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").unique().notNull(),
});

export const cardType = pgEnum("card_type", [
  "text",
  "url",
  "pdf",
  "youtube",
  "tweet",
  "spotify",
]);

export const cardStatusEnum = pgEnum("card_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const indexCards = pgTable("index_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  indexId: uuid("index_id")
    .notNull()
    .references(() => indexes.id, { onDelete: "cascade" }),
  type: cardType("type").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  shareableId: uuid("shareable_id").defaultRandom().notNull().unique(),
  source: text("source").notNull(),
  processedContent: text("processed_content").default(""),
  status: cardStatusEnum("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  storageUrl: text("storage_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cardsToTags = pgTable(
  "cards_to_tags",
  {
    cardId: uuid("card_id")
      .notNull()
      .references(() => indexCards.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.cardId, table.tagId] }),
    index("tag_idx").on(table.tagId),
  ]
);

export const cardChunks = pgTable("card_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => indexCards.id, { onDelete: "cascade" }),
  chunkText: text("chunk_text").notNull(),
  embedding: vector("embedding", { dimensions: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
