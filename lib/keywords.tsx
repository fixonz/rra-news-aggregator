import type React from "react"
/**
 * Keywords to highlight in crypto news and social posts
 * Organized by category for better management
 */

// Price movement keywords
export const priceKeywords = [
  "surge",
  "soar",
  "jump",
  "spike",
  "rally",
  "bull",
  "bullish",
  "moon",
  "ath",
  "all-time high",
  "record high",
  "crash",
  "dump",
  "plummet",
  "plunge",
  "drop",
  "fall",
  "bear",
  "bearish",
  "correction",
  "dip",
]

// Regulatory keywords
export const regulatoryKeywords = [
  "sec",
  "regulation",
  "regulatory",
  "ban",
  "illegal",
  "compliance",
  "approve",
  "approval",
  "reject",
  "lawsuit",
  "court",
  "legal",
  "legislation",
  "bill",
  "government",
  "treasury",
  "fed",
  "central bank",
  "policy",
]

// Security keywords
export const securityKeywords = [
  "hack",
  "exploit",
  "vulnerability",
  "breach",
  "attack",
  "stolen",
  "theft",
  "phishing",
  "scam",
  "fraud",
  "security",
  "compromise",
]

// Technical keywords
export const technicalKeywords = [
  "fork",
  "upgrade",
  "update",
  "protocol",
  "mainnet",
  "testnet",
  "launch",
  "release",
  "halving",
  "mining",
  "staking",
  "consensus",
  "layer 2",
  "scaling",
  "rollup",
  "sidechain",
]

// Market keywords
export const marketKeywords = [
  "etf",
  "futures",
  "options",
  "institutional",
  "adoption",
  "investment",
  "fund",
  "custody",
  "liquidity",
  "volume",
  "market cap",
  "dominance",
  "altcoin",
  "season",
  "defi",
  "nft",
  "dao",
  "yield",
  "apy",
  "cryptocurrency",
  "crypto",
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "blockchain",
  "token",
  "digital asset",
  "economy",
  "transactions",
  "privacy",
  "stablecoin",
  "payment",
  "trading"
]

// Combine all keywords
export const allKeywords = [
  ...priceKeywords,
  ...regulatoryKeywords,
  ...securityKeywords,
  ...technicalKeywords,
  ...marketKeywords,
]

// Map keywords to their categories for color coding
export const keywordCategories: Record<string, string> = {}

priceKeywords.forEach((keyword) => {
  keywordCategories[keyword] = "price"
})

regulatoryKeywords.forEach((keyword) => {
  keywordCategories[keyword] = "regulatory"
})

securityKeywords.forEach((keyword) => {
  keywordCategories[keyword] = "security"
})

technicalKeywords.forEach((keyword) => {
  keywordCategories[keyword] = "technical"
})

marketKeywords.forEach((keyword) => {
  keywordCategories[keyword] = "market"
})

// Function to get category color class - **UPDATED FOR GREEN TERMINAL STYLE**
export function getHighlightStyle(category: string): string {
  switch (category) {
    case "price": // Price movements - Inverse Green
      return "bg-emerald-400 text-black font-bold px-0.5";
    case "regulatory": // Regulatory - Inverse Blue/Cyan
      return "bg-cyan-400 text-black font-bold px-0.5";
    case "security": // Security - Inverse Red
      return "bg-red-500 text-white font-bold px-0.5";
    case "technical": // Technical - Inverse Bright Green
      return "bg-lime-400 text-black font-bold px-0.5";
    case "market": // Market/Adoption - Inverse Purple
      return "bg-fuchsia-500 text-white font-bold px-0.5";
    default: // Default for uncategorized
      return "bg-gray-500 text-white font-bold px-0.5";
  }
}

// Function to highlight keywords in text - **REVISED LOGIC**
export function highlightKeywords(text: string | undefined | null): React.ReactNode[] {
  if (!text) return [text || ""];
  console.log("[highlightKeywords] Input:", text.substring(0,100)); // Log input (truncated)

  const sortedKeywords = [...allKeywords].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${sortedKeywords.map(kw => kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|")})\\b`, "gi");
  console.log("[highlightKeywords] Pattern:", pattern.toString()); // Log pattern

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchesFound = 0;

  for (const match of text.matchAll(pattern)) {
    matchesFound++;
    const keyword = match[0]; 
    const index = match.index || 0;
    console.log(`[highlightKeywords] Match found: '${keyword}' at index ${index}`); // Log matches

    if (index > lastIndex) {
      result.push(text.substring(lastIndex, index));
    }

    const lowerKeyword = keyword.toLowerCase();
    const category = keywordCategories[lowerKeyword] || "market";
    const styleClass = getHighlightStyle(category);

    result.push(
      <span key={`${index}-${keyword}`} className={`${styleClass} rounded-sm`}>
        {keyword}
      </span>
    );

    lastIndex = index + keyword.length;
  }

  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  // Log if no matches were found for non-empty text
  if (matchesFound === 0 && text.length > 0) {
     console.log(`[highlightKeywords] No keywords found in: "${text.substring(0, 50)}..."`); // Log no matches
  }

  if (result.length === 0 && text.length > 0) {
      // console.log("[highlightKeywords] Result array is empty, returning original text.");
      return [text];
  } else if (result.length === 0 && text.length === 0) {
      return [""];
  }

  return result;
}
