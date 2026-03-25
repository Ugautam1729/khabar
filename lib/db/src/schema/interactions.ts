import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { articlesTable } from "./articles";

export const likesTable = pgTable("likes", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  articleId: text("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.articleId] }),
]);

export const savesTable = pgTable("saves", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  articleId: text("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.articleId] }),
]);

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Like = typeof likesTable.$inferSelect;
export type Save = typeof savesTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
