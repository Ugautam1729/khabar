import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, directMessagesTable, usersTable, articlesTable } from "@workspace/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/messages/conversations", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const convos = await db.select().from(conversationsTable)
      .where(or(
        eq(conversationsTable.user1Id, userId),
        eq(conversationsTable.user2Id, userId)
      ))
      .orderBy(desc(conversationsTable.lastMessageAt));

    const enriched = await Promise.all(convos.map(async (c) => {
      const otherUserId = c.user1Id === userId ? c.user2Id : c.user1Id;
      const [otherUser] = await db.select().from(usersTable)
        .where(eq(usersTable.id, otherUserId)).limit(1);
      return {
        id: c.id,
        otherUser: otherUser ? formatUser(otherUser) : null,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt?.toISOString() || null,
        unreadCount: 0,
      };
    }));

    return res.json({ conversations: enriched });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/messages/conversations", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { userId: otherUserId } = req.body;

    const [existing] = await db.select().from(conversationsTable)
      .where(or(
        and(eq(conversationsTable.user1Id, userId), eq(conversationsTable.user2Id, otherUserId)),
        and(eq(conversationsTable.user1Id, otherUserId), eq(conversationsTable.user2Id, userId))
      )).limit(1);

    if (existing) {
      const [otherUser] = await db.select().from(usersTable)
        .where(eq(usersTable.id, otherUserId)).limit(1);
      return res.json({
        id: existing.id,
        otherUser: otherUser ? formatUser(otherUser) : null,
        lastMessage: existing.lastMessage,
        lastMessageAt: existing.lastMessageAt?.toISOString() || null,
        unreadCount: 0,
      });
    }

    const id = generateId();
    const [convo] = await db.insert(conversationsTable).values({
      id,
      user1Id: userId,
      user2Id: otherUserId,
    }).returning();

    const [otherUser] = await db.select().from(usersTable)
      .where(eq(usersTable.id, otherUserId)).limit(1);

    return res.json({
      id: convo.id,
      otherUser: otherUser ? formatUser(otherUser) : null,
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/messages/conversations/:id", requireAuth, async (req, res) => {
  try {
    const messages = await db.select().from(directMessagesTable)
      .where(eq(directMessagesTable.conversationId, req.params.id))
      .orderBy(desc(directMessagesTable.createdAt))
      .limit(50);

    const enriched = await Promise.all(messages.map(async (m) => {
      let article = null;
      if (m.articleId) {
        const [a] = await db.select().from(articlesTable)
          .where(eq(articlesTable.id, m.articleId)).limit(1);
        if (a) {
          article = {
            id: a.id,
            title: a.title,
            summary: a.summary,
            content: a.content,
            imageUrl: a.imageUrl,
            sourceUrl: a.sourceUrl,
            sourceName: a.sourceName,
            category: a.category,
            publishedAt: a.publishedAt.toISOString(),
            likesCount: a.likesCount,
            commentsCount: a.commentsCount,
            savesCount: a.savesCount,
            isLiked: false,
            isSaved: false,
          };
        }
      }
      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        articleId: m.articleId,
        article,
        createdAt: m.createdAt.toISOString(),
      };
    }));

    return res.json({ messages: enriched.reverse() });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/messages/conversations/:id/send", requireAuth, async (req, res) => {
  try {
    const { content, articleId } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });

    const msgId = generateId();
    const [msg] = await db.insert(directMessagesTable).values({
      id: msgId,
      conversationId: req.params.id,
      senderId: req.userId!,
      content,
      articleId: articleId || null,
    }).returning();

    await db.update(conversationsTable)
      .set({ lastMessage: content, lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, req.params.id));

    return res.status(201).json({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      articleId: msg.articleId,
      article: null,
      createdAt: msg.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
