import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, likesTable, savesTable, commentsTable } from "@workspace/db/schema";
import { eq, desc, ilike, sql, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

async function enrichArticle(article: any, userId: string) {
  const [liked] = await db.select().from(likesTable)
    .where(and(eq(likesTable.userId, userId), eq(likesTable.articleId, article.id)))
    .limit(1);
  const [saved] = await db.select().from(savesTable)
    .where(and(eq(savesTable.userId, userId), eq(savesTable.articleId, article.id)))
    .limit(1);

  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    content: article.content,
    imageUrl: article.imageUrl,
    sourceUrl: article.sourceUrl,
    sourceName: article.sourceName,
    category: article.category,
    publishedAt: article.publishedAt?.toISOString() || new Date().toISOString(),
    likesCount: article.likesCount,
    commentsCount: article.commentsCount,
    savesCount: article.savesCount,
    isLiked: !!liked,
    isSaved: !!saved,
  };
}

router.get("/news/feed", requireAuth, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category as string;
    const offset = (page - 1) * limit;

    let articles;
    let total;
    if (category && category !== "all") {
      articles = await db.select().from(articlesTable)
        .where(eq(articlesTable.category, category))
        .orderBy(desc(articlesTable.publishedAt))
        .limit(limit)
        .offset(offset);
      total = await db.select({ count: sql<number>`count(*)` }).from(articlesTable)
        .where(eq(articlesTable.category, category));
    } else {
      articles = await db.select().from(articlesTable)
        .orderBy(desc(articlesTable.publishedAt))
        .limit(limit)
        .offset(offset);
      total = await db.select({ count: sql<number>`count(*)` }).from(articlesTable);
    }

    const enriched = await Promise.all(
      articles.map((a) => enrichArticle(a, req.userId!))
    );

    return res.json({
      articles: enriched,
      total: Number(total[0]?.count || 0),
      page,
      hasMore: offset + limit < Number(total[0]?.count || 0),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/news/trending", requireAuth, async (req, res) => {
  try {
    const articles = await db.select().from(articlesTable)
      .orderBy(desc(articlesTable.likesCount), desc(articlesTable.commentsCount))
      .limit(20);

    const enriched = await Promise.all(
      articles.map((a) => enrichArticle(a, req.userId!))
    );

    return res.json({
      articles: enriched,
      total: enriched.length,
      page: 1,
      hasMore: false,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/news/saved", requireAuth, async (req, res) => {
  try {
    const saved = await db.select({ articleId: savesTable.articleId })
      .from(savesTable)
      .where(eq(savesTable.userId, req.userId!))
      .orderBy(desc(savesTable.createdAt));

    if (saved.length === 0) {
      return res.json({ articles: [], total: 0, page: 1, hasMore: false });
    }

    const articleIds = saved.map((s) => s.articleId);
    const articles = await Promise.all(
      articleIds.map((id) =>
        db.select().from(articlesTable).where(eq(articlesTable.id, id)).limit(1)
      )
    );

    const flat = articles.flatMap((a) => a);
    const enriched = await Promise.all(flat.map((a) => enrichArticle(a, req.userId!)));

    return res.json({ articles: enriched, total: enriched.length, page: 1, hasMore: false });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/news/search", requireAuth, async (req, res) => {
  try {
    const q = req.query.q as string;
    const page = Number(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!q) return res.json({ articles: [], total: 0, page: 1, hasMore: false });

    const articles = await db.select().from(articlesTable)
      .where(ilike(articlesTable.title, `%${q}%`))
      .orderBy(desc(articlesTable.publishedAt))
      .limit(limit)
      .offset(offset);

    const enriched = await Promise.all(articles.map((a) => enrichArticle(a, req.userId!)));

    return res.json({ articles: enriched, total: enriched.length, page, hasMore: false });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/news/:id", requireAuth, async (req, res) => {
  try {
    const [article] = await db.select().from(articlesTable)
      .where(eq(articlesTable.id, req.params.id)).limit(1);
    if (!article) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichArticle(article, req.userId!);
    return res.json(enriched);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
