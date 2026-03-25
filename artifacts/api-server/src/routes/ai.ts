import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy",
});

// Chat endpoint — accepts full conversation history, streams response
router.post("/ai/chat/:articleId", requireAuth, async (req, res) => {
  try {
    const [article] = await db.select().from(articlesTable)
      .where(eq(articlesTable.id, req.params.articleId)).limit(1);

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const { messages } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const systemPrompt = `You are Khabar AI, a smart news assistant. You help users understand news articles deeply.

You have full knowledge of the following news article. Answer any questions the user has about it — explain context, background, implications, key people, terms, related events, or anything else they want to know. Keep answers conversational and concise unless the user asks for detail. If the user asks something unrelated to the article, gently redirect them back.

ARTICLE DETAILS:
Title: ${article.title}
Source: ${article.sourceName}
Category: ${article.category}
Published: ${article.publishedAt.toISOString()}

Content:
${article.content || article.summary}`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.write(`data: ${JSON.stringify({ error: "Failed to respond" })}\n\n`);
    res.end();
  }
});

// Keep old explain endpoint as alias for backwards compat
router.post("/ai/explain/:articleId", requireAuth, async (req, res) => {
  req.body = {
    messages: [{ role: "user", content: "Give me a detailed explanation of this article — key points, context, and why it matters." }]
  };
  res.redirect(307, `/api/ai/chat/${req.params.articleId}`);
});

export default router;
