import { NextResponse } from "next/server"

interface Post {
  id: string; // Or number, depending on your data
  content: string;
  postedAt: string; // Or Date
  // Add other relevant post fields here
}

// Cache mechanism to store previous results
interface CacheItem {
  timestamp: number;
  data: FeedItem[];
}

// Cache duration in milliseconds (10 minutes - increased for better performance)
const CACHE_DURATION = 10 * 60 * 1000;

// Maximum number of items to process to avoid excessive computation
const MAX_ITEMS_TO_PROCESS = 400;

// Maximum number of items to return to the client
const MAX_ITEMS_TO_RETURN = 150;

// Cache storage (in-memory)
let socialFeedCache: CacheItem | null = null;

// Define a generic FeedItem combining NewsItem and Post properties needed for deduplication
// Ensure properties used in deduplication/sorting exist here
interface FeedItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string; // Summary might be empty (e.g., for original TG posts)
  isPriceImpacting: boolean;
  sourceCount?: number;
  aggregatedSources?: string[];
  similarTitles?: { source: string, title: string }[]; // Add field for similar titles
  // Add properties specific to social if needed later, e.g., author
  author?: string;
  authorId?: string;
  itemType: 'news' | 'social';
  categories?: string[]; // Added for categorization
  sentiment?: 'positive' | 'negative' | 'neutral'; // Added for sentiment analysis
  sentimentConfidence?: number; // 0-100 confidence score
  sentimentTerms?: string[]; // Terms that triggered the sentiment
}

// Enhanced Basic sentiment analysis based on keywords with confidence level
interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-100 scale
  primaryTerms?: string[]; // The main terms that led to this classification
}

// Helper function for normalization (could be moved to lib/)
const normalizeTitle = (title: string): string => {
  if (!title) return "";
  
  let norm = title.toLowerCase();
  
  // Expanded common crypto terms to ignore in similarity matching
  const commonWords = [
      // Common article prefixes and headers
      /\b(breaking|alert|urgent|just in|update|report|analysis|exclusive|announced|report|review|price watch|explained|guide|tutorial|how to|sponsored|promoted|vs|versus)\b/gi, 
      // Common articles and prepositions
      /\b(a|an|the|is|are|was|were|to|of|for|on|in|at|by|with|as|it|its|will|be|has|had|have|can|could|should|would|may|might|must|here's|heres|what|you|need|know)\b/gi,
      // Common punctuation and trailing characters
      /[?!:;.,]$/,
      // Common crypto phrases that don't add distinguishing value
      /\b(price prediction|price analysis|price movement|market update|crypto market|btc|eth|bitcoin|ethereum|cryptocurrency|crypto|market cap|trading volume)\b/gi
  ];
  
  // Apply all regex replacements
  commonWords.forEach(regex => norm = norm.replace(regex, " "));
  
  // Replace all non-alphanumeric with spaces and normalize whitespace
  norm = norm.replace(/[^\w\s]|_/g, " ").replace(/\s+/g, " ").trim();
  
  // Limit length for performance
  return norm.slice(0, 80);
};

// New similarity function that returns a score between 0-1
const getSimilarityScore = (title1: string, title2: string): number => {
  const normalized1 = normalizeTitle(title1);
  const normalized2 = normalizeTitle(title2);
  
  if (!normalized1 || !normalized2) return 0;
  if (normalized1 === normalized2) return 1;
  
  // Simple Jaccard similarity for word overlap
  const words1 = new Set(normalized1.split(' ').filter(Boolean));
  const words2 = new Set(normalized2.split(' ').filter(Boolean));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Count intersections
  let intersectionCount = 0;
  words1.forEach(word => {
    if (words2.has(word)) intersectionCount++;
  });
  
  // Jaccard similarity: intersection / union
  const unionCount = words1.size + words2.size - intersectionCount;
  return intersectionCount / unionCount;
};

// Enhanced sentiment analysis based on keywords with confidence level
const analyzeSentiment = (text: string): SentimentResult => {
  if (!text) return { sentiment: 'neutral', confidence: 0 };
  
  const normalized = text.toLowerCase();
  
  // Enhanced term lists with weighted importance
  const positiveTerms = [
    { term: 'bullish', weight: 3 },
    { term: 'surge', weight: 2 },
    { term: 'rally', weight: 2 },
    { term: 'gain', weight: 1 },
    { term: 'profit', weight: 1 },
    { term: 'climb', weight: 1 },
    { term: 'rise', weight: 1 },
    { term: 'soar', weight: 2 },
    { term: 'uptrend', weight: 2 },
    { term: 'upside', weight: 1 },
    { term: 'growth', weight: 1 },
    { term: 'record high', weight: 3 },
    { term: 'breakthrough', weight: 2 },
    { term: 'milestone', weight: 1 },
    { term: 'opportunity', weight: 1 },
    { term: 'optimistic', weight: 2 },
    { term: 'outperform', weight: 2 }
  ];
  
  const negativeTerms = [
    { term: 'bearish', weight: 3 },
    { term: 'crash', weight: 3 },
    { term: 'plunge', weight: 2 },
    { term: 'drop', weight: 1 },
    { term: 'fall', weight: 1 },
    { term: 'decline', weight: 1 },
    { term: 'down', weight: 1 },
    { term: 'loss', weight: 1 },
    { term: 'downtrend', weight: 2 },
    { term: 'warning', weight: 1 },
    { term: 'risk', weight: 1 },
    { term: 'danger', weight: 2 },
    { term: 'trouble', weight: 1 },
    { term: 'sell-off', weight: 2 }, 
    { term: 'dump', weight: 2 },
    { term: 'correction', weight: 1 },
    { term: 'concern', weight: 1 }
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  const primaryPositiveTerms: string[] = [];
  const primaryNegativeTerms: string[] = [];
  
  // Check each term with weighted scoring
  positiveTerms.forEach(item => {
    // Check for full word match with \b word boundary
    const regex = new RegExp(`\\b${item.term}\\b`, 'i');
    if (regex.test(normalized)) {
      positiveScore += item.weight;
      primaryPositiveTerms.push(item.term);
    }
  });
  
  negativeTerms.forEach(item => {
    const regex = new RegExp(`\\b${item.term}\\b`, 'i');
    if (regex.test(normalized)) {
      negativeScore += item.weight;
      primaryNegativeTerms.push(item.term);
    }
  });
  
  // Calculate confidence as percentage of maximum possible score (arbitrary scaling)
  // Assuming max reasonable score is around 5
  const maxReasonableScore = 5;
  let confidence = 0;
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  let primaryTerms: string[] = [];
  
  if (positiveScore > negativeScore) {
    confidence = Math.min(100, Math.round((positiveScore / maxReasonableScore) * 100));
    sentiment = 'positive';
    primaryTerms = primaryPositiveTerms;
  } else if (negativeScore > positiveScore) {
    confidence = Math.min(100, Math.round((negativeScore / maxReasonableScore) * 100));
    sentiment = 'negative';
    primaryTerms = primaryNegativeTerms;
  } else {
    sentiment = 'neutral';
    confidence = 0;
  }
  
  // If confidence is very low but not zero, set a minimum threshold
  if (confidence > 0 && confidence < 20) {
    confidence = 20; // Minimum confidence if any terms matched
  }
  
  return {
    sentiment,
    confidence,
    primaryTerms: primaryTerms.length > 0 ? primaryTerms : undefined
  };
};

// Basic categorization based on keywords
const categorizeContent = (text: string): string[] => {
  if (!text) return ['general'];
  
  const normalized = text.toLowerCase();
  const categories = [];
  
  if (/\b(bitcoin|btc)\b/i.test(normalized)) categories.push('bitcoin');
  if (/\b(ethereum|eth)\b/i.test(normalized)) categories.push('ethereum');
  if (/\b(defi|decentralized finance)\b/i.test(normalized)) categories.push('defi');
  if (/\b(nft|non.fungible)\b/i.test(normalized)) categories.push('nft');
  if (/\b(regulation|regulat|law|legal|government)\b/i.test(normalized)) categories.push('regulation');
  if (/\b(exchange|binance|coinbase|kraken|ftx)\b/i.test(normalized)) categories.push('exchange');
  if (/\b(wallet|custody|storage)\b/i.test(normalized)) categories.push('wallet');
  if (/\b(hack|security|breach|theft|vulnerability)\b/i.test(normalized)) categories.push('security');
  
  // Default category if none matched
  if (categories.length === 0) categories.push('general');
  
  return categories;
};

export async function GET() {
  console.log("Combined Social Feed API hit - checking cache");
  
  // Force cache invalidation for debugging
  console.log("DEBUG: Invalidating cache to ensure fresh content");
  socialFeedCache = null;
  
  // Debug the cache status
  if (socialFeedCache !== null) {
    console.log(`[SocialFeed] Cache found, age: ${(Date.now() - socialFeedCache.timestamp) / 1000}s, items: ${socialFeedCache.data.length}`);
  } else {
    console.log("[SocialFeed] No cache found or cache invalidated");
  }
  
  // Check if we have a valid cache and it's not expired
  if (socialFeedCache !== null && (Date.now() - socialFeedCache.timestamp < CACHE_DURATION)) {
    console.log(`[SocialFeed] Returning cached data, age: ${(Date.now() - socialFeedCache.timestamp) / 1000}s`);
    return NextResponse.json({ 
      posts: socialFeedCache.data, 
      status: "cached",
      cacheAge: Date.now() - socialFeedCache.timestamp
    });
  }
  
  // Cache is expired or doesn't exist, fetch fresh data
  console.log("Fetching fresh from underlying APIs (/rss-news, /telegram-posts)");

  try {
    // Construct base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const telegramApiUrl = new URL("/api/telegram-posts", baseUrl);
    const rssApiUrl = new URL("/api/rss-news", baseUrl);

    console.log(`[SocialFeed] Fetching from: ${telegramApiUrl} and ${rssApiUrl}`);

    // Fetch from both internal APIs concurrently
    const [telegramResponse, rssResponse] = await Promise.allSettled([
      fetch(telegramApiUrl.toString()),
      fetch(rssApiUrl.toString()),
    ]);

    console.log(`[SocialFeed] Telegram API response: ${telegramResponse.status}`);
    console.log(`[SocialFeed] RSS API response: ${rssResponse.status}`);

    let telegramPosts: FeedItem[] = [];
    if (telegramResponse.status === 'fulfilled' && telegramResponse.value.ok) {
      const data = await telegramResponse.value.json();
      console.log(`[SocialFeed] Telegram data received: ${data.posts?.length || 0} posts`);
      
      // Map Telegram data to FeedItem structure
      telegramPosts = (data.posts || []).map((post: any): FeedItem => {
        const sentimentResult = analyzeSentiment(post.content);
        
        return {
          id: post.id,
          title: post.content, // Use content as title for TG
          source: post.source, // Should be "Telegram"
          url: post.url,
          publishedAt: post.postedAt,
          summary: "", // No separate summary for TG posts
          isPriceImpacting: post.content?.toLowerCase().includes("bitcoin") || false, // Example impacting logic for TG
          author: post.author, // Keep TG author (channel name)
          authorId: post.authorId,
          itemType: 'social',
          sourceCount: 1,
          aggregatedSources: [post.source],
          sentiment: sentimentResult.sentiment,
          sentimentConfidence: sentimentResult.confidence,
          sentimentTerms: sentimentResult.primaryTerms,
          categories: categorizeContent(post.content)
        };
      });
      console.log(`[SocialFeed] Mapped ${telegramPosts.length} Telegram posts.`);
    } else {
      console.error("Failed to fetch or process Telegram posts:", telegramResponse.status === 'rejected' 
        ? telegramResponse.reason 
        : await telegramResponse.value.text());
    }

    let newsItems: FeedItem[] = [];
    if (rssResponse.status === 'fulfilled' && rssResponse.value.ok) {
      const data = await rssResponse.value.json();
      console.log(`[SocialFeed] RSS data received: ${data.news?.length || 0} items`);
      
      // Map RSS data to FeedItem structure (it should already be close)
      newsItems = (data.news || []).map((item: any): FeedItem => {
        const combinedText = `${item.title} ${item.summary || ""}`;
        const sentimentResult = analyzeSentiment(combinedText);
        
        return { 
          ...item, 
          itemType: 'news',
          // Ensure all required FeedItem props exist
          summary: item.summary || "", 
          isPriceImpacting: item.isPriceImpacting || false,
          sourceCount: item.sourceCount || 1,
          aggregatedSources: item.aggregatedSources || [item.source],
          sentiment: sentimentResult.sentiment,
          sentimentConfidence: sentimentResult.confidence,
          sentimentTerms: sentimentResult.primaryTerms,
          categories: categorizeContent(combinedText)
        };
      });
      console.log(`[SocialFeed] Mapped ${newsItems.length} RSS news items.`);
    } else {
      console.error("Failed to fetch or process RSS news:", rssResponse.status === 'rejected' 
        ? rssResponse.reason 
        : await rssResponse.value.text());
    }

    // Combine all items with limits to prevent excessive processing
    let combinedItems: FeedItem[] = [...telegramPosts, ...newsItems];
    console.log(`[SocialFeed] Combined: ${telegramPosts.length} telegram + ${newsItems.length} RSS = ${combinedItems.length} items`);
    
    // If we have no items, something is wrong - return a clear error
    if (combinedItems.length === 0) {
      console.error("[SocialFeed] ERROR: No items found from either source!");
      return NextResponse.json({
        posts: [],
        error: "No items found from RSS or Telegram sources",
        status: "error_no_items"
      }, { status: 500 });
    }

    // Generate a simple feed for debugging if needed
    const debugItems = combinedItems.slice(0, 5).map(item => ({
      id: item.id,
      title: item.title?.substring(0, 30) + "...",
      source: item.source
    }));
    console.log("[SocialFeed] Debug sample items:", JSON.stringify(debugItems, null, 2));

    // Limit initial combined items if there are too many to process efficiently
    if (combinedItems.length > MAX_ITEMS_TO_PROCESS) {
      console.log(`[SocialFeed] Limiting initial processing from ${combinedItems.length} to ${MAX_ITEMS_TO_PROCESS} items`);
      // Sort by recency first to get the newest ones
      combinedItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      combinedItems = combinedItems.slice(0, MAX_ITEMS_TO_PROCESS);
    }

    console.log(`[SocialFeed] Total combined items BEFORE dedupe: ${combinedItems.length}`);
    
    // --- IMPROVED CLUSTERING LOGIC ---
    // Instead of exact normalization matches, use similarity scoring
    
    const processedItems: FeedItem[] = [];
    const remainingItems = [...combinedItems];
    
    while (remainingItems.length > 0) {
      const currentItem = remainingItems.shift()!; // Remove and get first item
      
      // Find similar items with threshold (0.7 = 70% similarity)
      const similarItems: FeedItem[] = [];
      const similarityThreshold = 0.7;
      
      // Use for loop with index for removal during iteration
      for (let i = remainingItems.length - 1; i >= 0; i--) {
        const comparisonItem = remainingItems[i];
        const similarity = getSimilarityScore(currentItem.title, comparisonItem.title);
        
        if (similarity >= similarityThreshold) {
          similarItems.push(comparisonItem);
          remainingItems.splice(i, 1); // Remove the similar item
        }
      }
      
      if (similarItems.length === 0) {
        // No similar items, just add current item as is
        processedItems.push(currentItem);
      } else {
        // We have similar items - cluster them
        const allItems = [currentItem, ...similarItems];
        
        // Sort to pick representative - prioritize news type and longer summaries
        allItems.sort((a, b) => {
          if (a.isPriceImpacting !== b.isPriceImpacting) return a.isPriceImpacting ? -1 : 1;
          if (a.itemType !== b.itemType) return a.itemType === 'news' ? -1 : 1; 
          const summaryA = a.summary || a.title || "";
          const summaryB = b.summary || b.title || "";
          if (summaryB.length !== summaryA.length) return summaryB.length - summaryA.length;
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        });
        
        const representativeItem = allItems[0];
        console.log(`Cluster: [${representativeItem.source}] ${representativeItem.title?.substring(0,40)}... (${allItems.length} items)`);
            
        // Get unique sources and collect similar titles for UI display
        const sources = Array.from(new Set(allItems.map(item => item.source)));
        const similarTitles = allItems
          .filter(item => item.id !== representativeItem.id) 
          .map(item => ({ source: item.source || 'Unknown', title: item.title || '(No Title)' }));
            
        // Combine categories across all similar items
        const allCategories = new Set<string>();
        allItems.forEach(item => {
          (item.categories || []).forEach(cat => allCategories.add(cat));
        });
        
        // Take earliest timestamp from the cluster
        const earliestItem = allItems.reduce(
          (earliest, current) => new Date(current.publishedAt).getTime() < new Date(earliest.publishedAt).getTime() ? current : earliest, 
          allItems[0]
        );
        
        // Create enhanced cluster item
        processedItems.push({
            ...representativeItem, 
            publishedAt: earliestItem.publishedAt, 
            source: representativeItem.source, 
            sourceCount: sources.length,
            aggregatedSources: sources,
            similarTitles: similarTitles.length > 0 ? similarTitles : undefined,
            categories: Array.from(allCategories),
        });
      }
    }

    console.log(`[SocialFeed] Total items AFTER clustering: ${processedItems.length}`);

    // Sort final list
    processedItems.sort((a, b) => {
      // Primary sort by recency
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // At the end, limit final feed 
    const finalFeed = processedItems.slice(0, MAX_ITEMS_TO_RETURN);

    // After processing and before returning the results, update the cache
    socialFeedCache = {
      timestamp: Date.now(),
      data: finalFeed
    };

    console.log(`[SocialFeed] Final feed has ${finalFeed.length} items, caching now`);
    
    // Return actual data
    return NextResponse.json({
      posts: finalFeed, 
      status: "fresh",
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("Error in combined social feed API:", error);
    console.error(error instanceof Error ? error.stack : "No stack trace available");
    
    // Return error details to help diagnose the issue
    return NextResponse.json(
      {
        posts: [],
        error: error instanceof Error ? error.message : "Unknown error combining feeds",
        errorStack: error instanceof Error ? error.stack : "No stack trace",
        status: "error",
      },
      { status: 500 },
    );
  }
}
