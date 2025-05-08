import { NextResponse } from "next/server"
import { parseRssFeed, isPriceImpacting } from "@/lib/rss-parser"

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  isPriceImpacting: boolean;
  boostScore?: number; // Will be replaced by sourceCount/aggregatedSources
  sourceCount?: number;
  aggregatedSources?: string[];
}

interface CacheEntry {
  timestamp: number;
  data: NewsItem[];
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
let newsCache: CacheEntry | null = null;

export async function GET() {
  try {
    // Check cache
    if (newsCache && (Date.now() - newsCache.timestamp < CACHE_DURATION)) {
      console.log("Returning cached RSS news");
      return NextResponse.json({ news: newsCache.data });
    }
    console.log("Fetching fresh RSS news, cache expired or empty");

    // List of crypto news RSS feeds
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
      // Removing problematic feed: "https://bitcointe.com/feed/",
      "https://cryptopurview.com/feed/",
      "https://zycrypto.com/feed/",
      "https://thebitcoinnews.com/feed/",
    ]

    // Fetch and parse multiple RSS feeds
    const newsPromises = rssFeeds.map(async (feedUrl) => {
      try {
        // Actually parse the RSS feed - no more mock data!
        const items = await parseRssFeed(feedUrl)

        // Transform the items to our format
        return items.map((item) => {
          const sourceName = new URL(feedUrl).hostname.replace("www.", "").split(".")[0]

          return {
            id: item.guid || item.link || `${sourceName}-${Date.now()}-${Math.random()}`,
            title: item.title || "No title",
            source: sourceName.charAt(0).toUpperCase() + sourceName.slice(1),
            url: item.link || feedUrl,
            publishedAt: item.pubDate || new Date().toISOString(),
            summary: item.contentSnippet || item.description || "No summary available",
            isPriceImpacting: isPriceImpacting(item),
          }
        })
      } catch (error) {
        console.error(`Error fetching RSS feed ${feedUrl}:`, error)
        return [] // Return empty array for failed feeds
      }
    })

    // Wait for all promises to resolve, even if some fail
    const newsResults = await Promise.allSettled(newsPromises)

    // Flatten the array of arrays
    let allNewsItems: NewsItem[] = newsResults
      .filter((result): result is PromiseFulfilledResult<NewsItem[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    // --- Filter out potential ads/spam BEFORE deduplication ---
    const spamKeywords = [
      'giveaway', 'airdrop', 'sign up', 'limited offer', 'special deal', 'exclusive access', 
      'click here', 'free crypto', 'guaranteed profit', 'make money fast', 'investment opportunity', 
      'whitelist now', 'presale live', 'ico starting', 'join telegram', // Be careful with 'join telegram' if legit sources use it
      'promoted content', 'sponsored post',
      'how to', 'guide', 'tutorial', 'explained', 'need to know', 'beginner\'s guide',
      'what is', 'what are',
      'opinion'
    ];
    const spamRegex = new RegExp(spamKeywords.map(kw => kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|"), "i");

    const initialItemCount = allNewsItems.length;
    allNewsItems = allNewsItems.filter(item => {
      const textToCheck = `${item.title.toLowerCase()} ${item.summary.toLowerCase()}`;
      const isSpam = spamRegex.test(textToCheck);
      // Basic check for overly short/empty content - might indicate low quality
      const isEmpty = item.title.length < 10 && item.summary.length < 20;
      if (isSpam || isEmpty) {
         // console.log(`Filtering spam/empty: [${item.source}] ${item.title}`); // Optional logging
         return false;
      }
      return true;
    });
    console.log(`Filtered ${initialItemCount - allNewsItems.length} potential spam/empty items.`);

    // --- Deduplication Logic ---
    const normalizeTitle = (title: string): string => {
      // More aggressive normalization: lower, remove common connecting/filler words, then non-alphanum, collapse whitespace, then slice.
      let norm = title.toLowerCase();
      const commonWords = [
        /\\b(breaking|alert|urgent|just in|update|analysis|report|review|price watch|explained|guide|tutorial|how to|sponsored|promoted|vs|versus)\\b/gi,
        /\\b(a|an|the|is|are|was|were|to|of|for|on|in|at|by|with|as|it|its|will|be|has|had|have|can|could|should|would|may|might|must|here's|heres|what|you|need|know)\\b/gi,
        /[\\?]$/ // Remove trailing question mark
      ];
      commonWords.forEach(regex => norm = norm.replace(regex, ""));
      // Remove punctuation (except spaces), collapse multiple spaces to one, trim, slice
      return norm.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim().slice(0, 70); // Keep 70 chars after cleanup
    };

    const groupedByNormalizedTitle: Record<string, NewsItem[]> = {};
    allNewsItems.forEach(item => {
      const normalized = normalizeTitle(item.title);
      if (!groupedByNormalizedTitle[normalized]) {
        groupedByNormalizedTitle[normalized] = [];
      }
      groupedByNormalizedTitle[normalized].push(item);
    });

    const deduplicatedNews: NewsItem[] = Object.values(groupedByNormalizedTitle).map(group => {
      if (group.length === 1) {
        return { ...group[0], sourceCount: 1, aggregatedSources: [group[0].source] };
      }

      // Sort group to pick the best representative: impacting first, then longest summary, then earliest
      group.sort((a, b) => {
        if (a.isPriceImpacting !== b.isPriceImpacting) return a.isPriceImpacting ? -1 : 1;
        if (b.summary.length !== a.summary.length) return b.summary.length - a.summary.length;
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      });
      
      const representativeItem = group[0];
      const sources = Array.from(new Set(group.map(item => item.source)));
      
      return {
        ...representativeItem, // Takes id, title, summary, url, isPriceImpacting from the best one
        publishedAt: group.reduce((earliest, current) => 
          new Date(current.publishedAt).getTime() < new Date(earliest.publishedAt).getTime() ? current : earliest
        ).publishedAt, // Use the earliest publishedAt from the group
        source: representativeItem.source, // Keep the source of the representative item as primary
        sourceCount: sources.length,
        aggregatedSources: sources,
      };
    });

    // Sort final deduplicated list: impacting first, then by sourceCount (multi-source higher), then by publishedAt
    deduplicatedNews.sort((a, b) => {
      if (a.isPriceImpacting !== b.isPriceImpacting) return a.isPriceImpacting ? -1 : 1; // Impacting first
      if ((b.sourceCount || 1) !== (a.sourceCount || 1)) { // Higher source count (more sources) first
        return (b.sourceCount || 1) - (a.sourceCount || 1);
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(); // Newest first
    });
    
    // Slice after sorting
    const finalNews = allNewsItems.slice(0, 100);
 
    // Store in cache
    newsCache = {
      timestamp: Date.now(),
      data: finalNews, // Cache the sorted and sliced news
    };

    return NextResponse.json({ news: finalNews })
  } catch (error) {
    console.error("Error in RSS news API:", error)
    return NextResponse.json({ news: [] }, { status: 500 })
  }
}
