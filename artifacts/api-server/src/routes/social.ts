import { Router } from "express";
import { db } from "@workspace/db";
import { likesTable, savesTable, commentsTable, articlesTable, usersTable, notificationsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

router.post("/news/:id/like", requireAuth, async (req, res) => {
  try {
    const articleId = req.params.id;
    const userId = req.userId!;

    const [existing] = await db.select().from(likesTable)
      .where(and(eq(likesTable.userId, userId), eq(likesTable.articleId, articleId)))
      .limit(1);

    if (existing) {
      await db.delete(likesTable)
        .where(and(eq(likesTable.userId, userId), eq(likesTable.articleId, articleId)));
      await db.update(articlesTable)
        .set({ likesCount: db.$count(likesTable, eq(likesTable.articleId, articleId)) as any })
        .where(eq(articlesTable.id, articleId));

      const [article] = await db.select({ likesCount: articlesTable.likesCount })
        .from(articlesTable).where(eq(articlesTable.id, articleId));
      return res.json({ liked: false, likesCount: Math.max(0, (article?.likesCount || 1) - 1) });
    } else {
      await db.insert(likesTable).values({ userId, articleId });

      const [article] = await db.select({ likesCount: articlesTable.likesCount })
        .from(articlesTable).where(eq(articlesTable.id, articleId));
      const newCount = (article?.likesCount || 0) + 1;
      await db.update(articlesTable).set({ likesCount: newCount }).where(eq(articlesTable.id, articleId));

      return res.json({ liked: true, likesCount: newCount });
    }
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/news/:id/save", requireAuth, async (req, res) => {
  try {
    const articleId = req.params.id;
    const userId = req.userId!;

    const [existing] = await db.select().from(savesTable)
      .where(and(eq(savesTable.userId, userId), eq(savesTable.articleId, articleId)))
      .limit(1);

    if (existing) {
      await db.delete(savesTable)
        .where(and(eq(savesTable.userId, userId), eq(savesTable.articleId, articleId)));
      const [article] = await db.select({ savesCount: articlesTable.savesCount })
        .from(articlesTable).where(eq(articlesTable.id, articleId));
      return res.json({ saved: false, savesCount: Math.max(0, (article?.savesCount || 1) - 1) });
    } else {
      await db.insert(savesTable).values({ userId, articleId });
      const [article] = await db.select({ savesCount: articlesTable.savesCount })
        .from(articlesTable).where(eq(articlesTable.id, articleId));
      const newCount = (article?.savesCount || 0) + 1;
      await db.update(articlesTable).set({ savesCount: newCount }).where(eq(articlesTable.id, articleId));
      return res.json({ saved: true, savesCount: newCount });
    }
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/news/:id/comments", requireAuth, async (req, res) => {
  try {
    const comments = await db.select().from(commentsTable)
      .where(eq(commentsTable.articleId, req.params.id))
      .orderBy(desc(commentsTable.createdAt));

    const enriched = await Promise.all(comments.map(async (c) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, c.userId)).limit(1);
      return {
        id: c.id,
        articleId: c.articleId,
        userId: c.userId,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        user: user ? {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          createdAt: user.createdAt.toISOString(),
        } : null,
      };
    }));

    return res.json({ comments: enriched });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/news/:id/comments", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });

    const id = generateId();
    const [comment] = await db.insert(commentsTable).values({
      id,
      articleId: req.params.id,
      userId: req.userId!,
      content,
    }).returning();

    const [article] = await db.select({ commentsCount: articlesTable.commentsCount })
      .from(articlesTable).where(eq(articlesTable.id, req.params.id));
    await db.update(articlesTable)
      .set({ commentsCount: (article?.commentsCount || 0) + 1 })
      .where(eq(articlesTable.id, req.params.id));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    return res.status(201).json({
      id: comment.id,
      articleId: comment.articleId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
