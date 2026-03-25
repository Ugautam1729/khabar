import { pgTable, text, timestamp, integer, boolean, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { articlesTable } from "./articles";

export const conversationsTable = pgTable("conversations", {
  id: text("id").primaryKey(),
  user1Id: text("user1_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  user2Id: text("user2_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const directMessagesTable = pgTable("direct_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  articleId: text("article_id").references(() => articlesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type DirectMessage = typeof directMessagesTable.$inferSelect;
