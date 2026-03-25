import axios from "axios";
import { db } from "@workspace/db";
import { articlesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const RSS_FEEDS = [
  { url: "https://feeds.bbci.co.uk/news/rss.xml", name: "BBC News", category: "general" },
  { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", name: "BBC Tech", category: "technology" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", name: "BBC Business", category: "business" },
  { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", name: "BBC Science", category: "science" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", name: "NY Times World", category: "world" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", name: "NY Times Tech", category: "technology" },
  { url: "https://feeds.reuters.com/reuters/topNews", name: "Reuters", category: "general" },
  { url: "https://feeds.reuters.com/reuters/businessNews", name: "Reuters Business", category: "business" },
  { url: "https://feeds.reuters.com/reuters/technologyNews", name: "Reuters Tech", category: "technology" },
  { url: "https://feeds.feedburner.com/TechCrunch", name: "TechCrunch", category: "technology" },
  { url: "https://www.wired.com/feed/rss", name: "Wired", category: "technology" },
  { url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", name: "Times of India", category: "india" },
  { url: "https://www.thehindu.com/feeder/default.rss", name: "The Hindu", category: "india" },
  { url: "https://economictimes.indiatimes.com/rssfeedstopstories.cms", name: "Economic Times", category: "business" },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function parseRssDate(dateStr: string): Date {
  try {
    return new Date(dateStr);
  } catch {
    return new Date();
  }
}

function extractImageFromContent(content: string): string | null {
  const match = content.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

async function parseRss(xmlText: string, feedName: string, category: string) {
  const items: Array<{
    title: string;
    summary: string;
    content: string;
    imageUrl: string | null;
    sourceUrl: string;
    sourceName: string;
    category: string;
    publishedAt: Date;
  }> = [];

  const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s);
    const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();

    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s);
    const rawDesc = (descMatch?.[1] || descMatch?.[2] || "").trim();
    const cleanDesc = rawDesc.replace(/<[^>]+>/g, "").trim();

    const linkMatch = itemXml.match(/<link>(.*?)<\/link>|<link[^>]+href="([^"]+)"/s);
    const sourceUrl = (linkMatch?.[1] || linkMatch?.[2] || "").trim();

    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/s);
    const publishedAt = parseRssDate((dateMatch?.[1] || "").trim());

    const imageMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"|<media:thumbnail[^>]+url="([^"]+)"/);
    let imageUrl = imageMatch ? (imageMatch[1] || imageMatch[2]) : extractImageFromContent(rawDesc);

    if (!title || !sourceUrl || cleanDesc.length < 20) continue;

    items.push({
      title: title.substring(0, 500),
      summary: cleanDesc.substring(0, 600),
      content: cleanDesc.substring(0, 5000) || title,
      imageUrl: imageUrl ? imageUrl.substring(0, 500) : null,
      sourceUrl: sourceUrl.substring(0, 1000),
      sourceName: feedName,
      category,
      publishedAt,
    });
  }

  return items;
}

export async function ingestNews() {
  logger.info("Starting news ingestion...");
  let totalInserted = 0;

  for (const feed of RSS_FEEDS) {
    try {
      const response = await axios.get(feed.url, {
        timeout: 10000,
        headers: { "User-Agent": "Khabar News App/1.0" },
      });

      const items = await parseRss(response.data, feed.name, feed.category);
      logger.info({ feed: feed.name, count: items.length }, "Parsed feed");

      for (const item of items) {
        try {
          const existing = await db.select({ id: articlesTable.id })
            .from(articlesTable)
            .where(eq(articlesTable.sourceUrl, item.sourceUrl))
            .limit(1);

          if (existing.length > 0) continue;

          await db.insert(articlesTable).values({
            id: generateId(),
            ...item,
          });
          totalInserted++;
        } catch (insertErr) {
          // Skip duplicates or errors
        }
      }
    } catch (fetchErr) {
      logger.warn({ feed: feed.name, err: fetchErr }, "Failed to fetch feed");
    }
  }

  logger.info({ totalInserted }, "News ingestion complete");
}
