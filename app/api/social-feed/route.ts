import { NextResponse } from "next/server";

interface FeedItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string;
  isPriceImpacting: boolean;
  sourceCount?: number;
  aggregatedSources?: string[];
  similarTitles?: { source: string; title: string }[];
  author?: string;
  authorId?: string;
  itemType: "news" | "social";
  categories?: string[];
  sentiment?: "positive" | "negative" | "neutral";
  sentimentConfidence?: number;
  sentimentTerms?: string[];
}

interface CacheItem {
  timestamp: number;
  data: FeedItem[];
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MAX_ITEMS_TO_PROCESS = 400;
const MAX_ITEMS_TO_RETURN = 150;

let socialFeedCache: CacheItem | null = null;

// --- Helpers (extracted) ---

const normalizeTitle = (title: string): string => {
  if (!title) return "";

  let norm = title.toLowerCase();

  const commonWords = [
    /\b(breaking|alert|urgent|just in|update|report|analysis|exclusive|announced|review|price watch|explained|guide|tutorial|how to|sponsored|promoted|vs|versus)\b/gi,
    /\b(a|an|the|is|are|was|were|to|of|for|on|in|at|by|with|as|it|its|will|be|has|had|have|can|could|should|would|may|might|must|here's|heres|what|you|need|know)\b/gi,
    /[?!:;.,]$/,
    /\b(price prediction|price analysis|price movement|market update|crypto market|btc|eth|bitcoin|ethereum|cryptocurrency|crypto|market cap|trading volume)\b/gi,
  ];

  commonWords.forEach((regex) => {
    norm = norm.replace(regex, " ");
  });

  norm = norm.replace(/[^\w\s]|_/g, " ").replace(/\s+/g, " ").trim();

  return norm.slice(0, 80);
};

const getSimilarityScore = (title1: string, title2: string): number => {
  const n1 = normalizeTitle(title1);
  const n2 = normalizeTitle(title2);
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 1;

  const set1 = new Set(n1.split(" ").filter(Boolean));
  const set2 = new Set(n2.split(" ").filter(Boolean));

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  set1.forEach((w) => set2.has(w) && intersection++);
  const union = set1.size + set2.size - intersection;

  return intersection / union;
};

interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  primaryTerms?: string[];
}

const analyzeSentiment = (text: string): SentimentResult => {
  if (!text) return { sentiment: "neutral", confidence: 0 };

  const normalized = text.toLowerCase();

  const positiveTerms = [
    { term: "bullish", weight: 3 },
    { term: "surge", weight: 2 },
    { term: "rally", weight: 2 },
    { term: "gain", weight: 1 },
    { term: "profit", weight: 1 },
    { term: "climb", weight: 1 },
    { term: "rise", weight: 1 },
    { term: "soar", weight: 2 },
    { term: "uptrend", weight: 2 },
    { term: "upside", weight: 1 },
    { term: "growth", weight: 1 },
    { term: "record high", weight: 3 },
    { term: "breakthrough", weight: 2 },
    { term: "milestone", weight: 1 },
    { term: "opportunity", weight: 1 },
    { term: "optimistic", weight: 2 },
    { term: "outperform", weight: 2 },
  ];

  const negativeTerms = [
    { term: "bearish", weight: 3 },
    { term: "crash", weight: 3 },
    { term: "plunge", weight: 2 },
    { term: "drop", weight: 1 },
    { term: "fall", weight: 1 },
    { term: "decline", weight: 1 },
    { term: "down", weight: 1 },
    { term: "loss", weight: 1 },
    { term: "downtrend", weight: 2 },
    { term: "warning", weight: 1 },
    { term: "risk", weight: 1 },
    { term: "danger", weight: 2 },
    { term: "trouble", weight: 1 },
    { term: "sell-off", weight: 2 },
    { term: "dump", weight: 2 },
    { term: "correction", weight: 1 },
    { term: "concern", weight: 1 },
  ];

  let positiveScore = 0;
  let negativeScore = 0;
  const primaryPositiveTerms: string[] = [];
  const primaryNegativeTerms: string[] = [];

  positiveTerms.forEach(({ term, weight }) => {
    if (new RegExp(`\\b${term}\\b`, "i").test(normalized)) {
      positiveScore += weight;
      primaryPositiveTerms.push(term);
    }
  });

  negativeTerms.forEach(({ term, weight }) => {
    if (new RegExp(`\\b${term}\\b`, "i").test(normalized)) {
      negativeScore += weight;
      primaryNegativeTerms.push(term);
    }
  });

  const maxScore = 5;
  let sentiment: SentimentResult["sentiment"] = "neutral";
  let confidence = 0;
  let primaryTerms: string[] = [];

  if (positiveScore > negativeScore) {
    confidence = Math.min(100, Math.round((positiveScore / maxScore) * 100));
    sentiment = "positive";
    primaryTerms = primaryPositiveTerms;
  } else if (negativeScore > positiveScore) {
    confidence = Math.min(100, Math.round((negativeScore / maxScore) * 100));
    sentiment = "negative";
    primaryTerms = primaryNegativeTerms;
  }

  if (confidence > 0 && confidence < 20) confidence = 20;

  return { sentiment, confidence, primaryTerms: primaryTerms.length ? primaryTerms : undefined };
};

const categorizeContent = (text: string): string[] => {
  if (!text) return ["general"];

  const normalized = text.toLowerCase();
  const categories: string[] = [];

  if (/\b(bitcoin|btc)\b/i.test(normalized)) categories.push("bitcoin");
  if (/\b(ethereum|eth)\b/i.test(normalized)) categories.push("ethereum");
  if (/\b(defi|decentralized finance)\b/i.test(normalized)) categories.push("defi");
  if (/\b(nft|non.fungible)\b/i.test(normalized)) categories.push("nft");
  if (/\b(regulation|regulat|law|legal|government)\b/i.test(normalized)) categories.push("regulation");
  if (/\b(exchange|binance|coinbase|kraken|ftx)\b/i.test(normalized)) categories.push("exchange");
  if (/\b(wallet|custody|storage)\b/i.test(normalized)) categories.push("wallet");
  if (/\b(hack|security|breach|theft|vulnerability)\b/i.test(normalized)) categories.push("security");

  if (categories.length === 0) categories.push("general");

  return categories;
};

// --- Main handler ---

export async function GET() {
  try {
    // Return cache early if valid
    if (socialFeedCache && Date.now() - socialFeedCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        posts: socialFeedCache.data,
        status: "cached",
        cacheAge: Date.now() - socialFeedCache.timestamp,
      });
    }

    // Prepare URLs for internal APIs
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const telegramApiUrl = new URL("/api/telegram-posts", baseUrl);
    const rssApiUrl = new URL("/api/rss-news", baseUrl);

    // Fetch Telegram and RSS concurrently with error handling
    const [telegramRes, rssRes] = await Promise.allSettled([
      fetch(telegramApiUrl.toString()),
      fetch(rssApiUrl.toString()),
    ]);

    let telegramPosts: FeedItem[] = [];
    if (telegramRes.status === "fulfilled" && telegramRes.value.ok) {
      const data = await telegramRes.value.json();
      telegramPosts = (data.posts || []).map((post: any): FeedItem => {
        const sentimentResult = analyzeSentiment(post.content);
        return {
          id: post.id,
          title: post.content,
          source: post.source || "Telegram",
          url: post.url,
          publishedAt: post.postedAt,
          summary: "",
          isPriceImpacting: post.content?.toLowerCase().includes("bitcoin") || false,
          author: post.author,
          authorId:
