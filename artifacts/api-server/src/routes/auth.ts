import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "khabar-secret-2024";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: "All fields required" });
    }

    const existing = await db.select().from(usersTable)
      .where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const usernameExists = await db.select().from(usersTable)
      .where(eq(usersTable.username, username)).limit(1);
    if (usernameExists.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = generateId();

    const [user] = await db.insert(usersTable).values({
      id,
      username,
      email,
      passwordHash,
      displayName,
    }).returning();

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

    return res.status(201).json({
      token,
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

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      token,
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

router.get("/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.id, payload.userId)).limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
