import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { sql } from "drizzle-orm";

const router = Router();

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

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.userId!))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    const enriched = await Promise.all(notifs.map(async (n) => {
      const [actor] = await db.select().from(usersTable)
        .where(eq(usersTable.id, n.actorId)).limit(1);
      return {
        id: n.id,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        articleId: n.articleId,
        actor: actor ? formatUser(actor) : null,
      };
    }));

    const unreadCount = notifs.filter((n) => !n.isRead).length;

    return res.json({ notifications: enriched, unreadCount });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/read", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.userId!));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
