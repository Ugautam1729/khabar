import { pgTable, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const articlesTable = pgTable("articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url").notNull().unique(),
  sourceName: text("source_name").notNull(),
  category: text("category").notNull().default("general"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  savesCount: integer("saves_count").notNull().default(0),
  publishedAt: timestamp("published_at").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
}, (table) => [
  index("articles_category_idx").on(table.category),
  index("articles_published_idx").on(table.publishedAt),
]);

export const insertArticleSchema = createInsertSchema(articlesTable).omit({
  likesCount: true,
  commentsCount: true,
  savesCount: true,
  fetchedAt: true,
});
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
