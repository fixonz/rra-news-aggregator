import { NextResponse } from "next/server";
import { parseRssFeed, isPriceImpacting } from "@/lib/rss-parser";

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  isPriceImpacting: boolean;
  boostScore?: number; // Placeholder for future scoring
  sourceCount?: number;
  aggregatedSources?: string[];
}

interface CacheEntry {
  timestamp: number;
  data: NewsItem[];
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in ms
let newsCache: CacheEntry | null = null;

// Utility: Safe date parser with fallback
const parseDate = (dateStr: string): number => {
  const time = Date.parse(dateStr);
  return isNaN(time) ? 0 : time;
};

// Utility: Normalize and clean titles for deduplication
const normalizeTitle = (title: string): string => {
  let norm = title.toLowerCase();

  // Remove common filler and promo words
  const commonWords = [
    /\b(breaking|alert|urgent|just in|update|analysis|report|review|price watch|explained|guide|tutorial|how to|sponsored|promoted|vs|versus)\b/gi,
    /\b(a|an|the|is|are|was|were|to|of|for|on|in|at|by|with|as|it|its|will|be|has|had|have|can|could|should|would|may|might|must|here's|heres|what|you|need|know)\b/gi,
    /[?]$/ // trailing question marks
  ];

  commonWords.forEach((regex) => {
    norm = norm.replace(regex, "");
  });

  // Remove punctuation except spaces, collapse whitespace, trim, slice
  norm = norm.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();

  return norm.slice(0, 70);
};

// Utility: Simple Title Case (optional enhancement)
const toTitleCase = (str: string): string =>
  str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));

export async function GET() {
  try {
    // Return cached data if still valid
    if (newsCache && Date.now() - newsCache.timestamp < CACHE_DURATION) {
      console.log("Returning cached RSS news");
      return NextResponse.json({ news: newsCache.data });
    }
    console.log("Fetching fresh RSS news, cache expired or empty");

    // RSS feed URLs
    const rssFeeds = [
      "https://cointelegraph.com/rss",
      "https://bitcoinist.com/feed/",
      "https://www.newsbtc.com/feed/",
      "https://cryptopotato.com/feed/",
      "https://99bitcoins.com/feed/",
      "https://cryptobriefing.com/feed/",
      "https://crypto.news/feed/",
      "https://coinlabz.com/feed/",
      "https://bitrss.com/rss.xml",
      // Removed problematic feed: "https://bitcointe.com/feed/",
      "https://cryptopurview.com/feed/",
      "https://zycrypto.com/feed/",
      "https://thebitcoinnews.com/feed/",
    ];

    // Fetch and parse all feeds in parallel, catch errors individually
    const newsPromises = rssFeeds.map(async (feedUrl) => {
      try {
        const items = await parseRssFeed(feedUrl);
        const sourceName = toTitleCase(
          new URL(feedUrl).hostname.replace(/^www\./, "").split(".")[0]
        );

        return items.map((item) => ({
          id:
            item.guid ||
            item.link ||
            `${sourceName}-${Date.now()}-${Math.random()}`,
          title: item.title || "No title",
          source: sourceName,
          url: item.link || feedUrl,
          publishedAt: item.pubDate || new Date().toISOString(),
          summary: item.contentSnippet || item.description || "No summary available",
          isPriceImpacting: isPriceImpacting(item),
        }));
      } catch (error) {
        console.error(`Error fetching/parsing RSS feed ${feedUrl}:`, error);
        return []; // Return empty for failed feeds
      }
    });

    // Wait for all feed promises, fulfilled or rejected
    const newsResults = await Promise.allSettled(newsPromises);

    // Flatten only fulfilled results
    let allNewsItems: NewsItem[] = newsResults
      .filter(
        (result): result is PromiseFulfilledResult<NewsItem[]> =>
          result.status === "fulfilled"
      )
      .flatMap((result) => result.value);

    // --- Filter spam / low quality content ---
    const spamKeywords = [
      "giveaway",
      "airdrop",
      "sign up",
      "limited offer",
      "special deal",
      "exclusive access",
      "click here",
      "free crypto",
      "guaranteed profit",
      "make money fast",
      "investment opportunity",
      "whitelist now",
      "presale live",
      "ico starting",
      "join telegram",
      "promoted content",
      "sponsored post",
      "how to",
      "guide",
      "tutorial",
      "explained",
      "need to know",
      "beginner's guide",
      "what is",
      "what are",
      "opinion",
    ];
    const spamRegex = new RegExp(
      spamKeywords.map((kw) => kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|"),
      "i"
    );

    const initialCount = allNewsItems.length;
    allNewsItems = allNewsItems.filter((item) => {
      const text = `${item.title.toLowerCase()} ${item.summary.toLowerCase()}`;
      const isSpam = spamRegex.test(text);
      const isEmpty = item.title.length < 10 && item.summary.length < 20;
      return !isSpam && !isEmpty;
    });
    console.log(`Filtered out ${initialCount - allNewsItems.length} spam/empty items.`);

    // --- Deduplicate by normalized title ---
    const groupedByNormalizedTitle: Record<string, NewsItem[]> = {};
    allNewsItems.forEach((item) => {
      const normTitle = normalizeTitle(item.title);
      if (!groupedByNormalizedTitle[normTitle]) {
        groupedByNormalizedTitle[normTitle] = [];
      }
      groupedByNormalizedTitle[normTitle].push(item);
    });

    const deduplicatedNews: NewsItem[] = Object.values(groupedByNormalizedTitle).map(
      (group) => {
        if (group.length === 1) {
          return {
            ...group[0],
            sourceCount: 1,
            aggregatedSources: [group[0].source],
          };
        }

        // Sort group: impacting first, longer summary, earliest date
        group.sort((a, b) => {
          if (a.isPriceImpacting !== b.isPriceImpacting)
            return a.isPriceImpacting ? -1 : 1;
          if (b.summary.length !== a.summary.length)
            return b.summary.length - a.summary.length;
          return parseDate(a.publishedAt) - parseDate(b.publishedAt);
        });

        const rep = group[0];
        const sources = Array.from(new Set(group.map((i) => i.source)));

        // Get earliest date in group
        const earliestDate = group.reduce((earliest, current) =>
          parseDate(current.publishedAt) < parseDate(earliest.publishedAt)
            ? current
            : earliest
        ).publishedAt;

        return {
          ...rep,
          publishedAt: earliestDate,
          sourceCount: sources.length,
          aggregatedSources: sources,
        };
      }
    );

    // Sort final deduped list: impacting first, then sourceCount desc, then newest date
    deduplicatedNews.sort((a, b) => {
      if (a.isPriceImpacting !== b.isPriceImpacting)
        return a.isPriceImpacting ? -1 : 1;
      if ((b.sourceCount || 1) !== (a.sourceCount || 1))
        return (b.sourceCount || 1) - (a.sourceCount || 1);
      return parseDate(b.publishedAt) - parseDate(a.publishedAt);
    });

    // Take top 100 news
    const finalNews = deduplicatedNews.slice(0, 100);

    // Cache results
    newsCache = {
      timestamp: Date.now(),
      data: finalNews,
    };

    return NextResponse.json({ news: finalNews });
  } catch (error) {
    console.error("Error in RSS news API:", error);
    return NextResponse.json({ news: [] }, { status: 500 });
  }
}
