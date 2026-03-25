import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const followsTable = pgTable("follows", {
  followerId: text("follower_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.followerId, table.followingId] }),
]);

export type Follow = typeof followsTable.$inferSelect;
