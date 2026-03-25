import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, followsTable } from "@workspace/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

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

router.get("/users/search", requireAuth, async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json({ users: [] });

    const found = await db.select().from(usersTable)
      .where(ilike(usersTable.username, `%${q}%`))
      .limit(20);

    const enriched = await Promise.all(found.map(async (u) => {
      const [following] = await db.select().from(followsTable)
        .where(and(
          eq(followsTable.followerId, req.userId!),
          eq(followsTable.followingId, u.id)
        )).limit(1);
      return { ...formatUser(u), isFollowing: !!following };
    }));

    return res.json({ users: enriched });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/me/profile", requireAuth, async (req, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const updates: Record<string, any> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const [updated] = await db.update(usersTable).set(updates)
      .where(eq(usersTable.id, req.userId!)).returning();

    return res.json(formatUser(updated));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.id, req.params.id)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const [following] = await db.select().from(followsTable)
      .where(and(
        eq(followsTable.followerId, req.userId!),
        eq(followsTable.followingId, user.id)
      )).limit(1);

    return res.json({ ...formatUser(user), isFollowing: !!following });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/:id/follow", requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const followerId = req.userId!;
    if (targetId === followerId) return res.status(400).json({ error: "Cannot follow yourself" });

    const [existing] = await db.select().from(followsTable)
      .where(and(
        eq(followsTable.followerId, followerId),
        eq(followsTable.followingId, targetId)
      )).limit(1);

    if (existing) {
      await db.delete(followsTable).where(and(
        eq(followsTable.followerId, followerId),
        eq(followsTable.followingId, targetId)
      ));

      await db.update(usersTable)
        .set({ followingCount: db.$count(followsTable, eq(followsTable.followerId, followerId)) as any })
        .where(eq(usersTable.id, followerId));
      await db.update(usersTable)
        .set({ followersCount: db.$count(followsTable, eq(followsTable.followingId, targetId)) as any })
        .where(eq(usersTable.id, targetId));

      return res.json({ following: false });
    } else {
      await db.insert(followsTable).values({ followerId, followingId: targetId });

      const [follower] = await db.select({ followingCount: usersTable.followingCount })
        .from(usersTable).where(eq(usersTable.id, followerId));
      const [target] = await db.select({ followersCount: usersTable.followersCount })
        .from(usersTable).where(eq(usersTable.id, targetId));

      await db.update(usersTable)
        .set({ followingCount: (follower?.followingCount || 0) + 1 })
        .where(eq(usersTable.id, followerId));
      await db.update(usersTable)
        .set({ followersCount: (target?.followersCount || 0) + 1 })
        .where(eq(usersTable.id, targetId));

      return res.json({ following: true });
    }
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
