/**
 * RSS Parser utility for fetching and parsing crypto news feeds
 */

import { allKeywords } from "./keywords"
import Parser from "rss-parser"

export interface RssItem {
  title?: string
  link?: string
  pubDate?: string
  creator?: string
  content?: string
  contentSnippet?: string
  categories?: string[]
  guid?: string
  description?: string
  isoDate?: string
}

export interface RssFeed {
  title?: string
  description?: string
  link?: string
  items: RssItem[]
}

// Create a new RSS parser instance
const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media"],
      ["content:encoded", "content"],
      ["dc:creator", "creator"],
    ],
  },
  timeout: 10000, // Set a timeout of 10 seconds
})

export async function parseRssFeed(feedUrl: string): Promise<RssItem[]> {
  try {
    // Use a CORS proxy for client-side fetching
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`

    // Fetch the RSS feed through the proxy with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`)
    }

    const xml = await response.text()

    // Parse the XML
    try {
      const feed = await parser.parseString(xml)
      console.log(`Successfully parsed feed from ${feedUrl} with ${feed.items.length} items`)
      return feed.items as RssItem[]
    } catch (parseError) {
      console.error(`Error parsing XML from ${feedUrl}:`, parseError)
      return []
    }
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error)
    return []
  }
}

// Function to determine if a news item might impact prices
export function isPriceImpacting(item: RssItem): boolean {
  const impactKeywords = [
    "crash",
    "surge",
    "soar",
    "plummet",
    "ban",
    "regulate",
    "sec",
    "hack",
    "security",
    "breach",
    "exploit",
    "vulnerability",
    "etf",
    "approval",
    "reject",
    "halving",
    "fork",
    "upgrade",
  ]

  const title = item.title?.toLowerCase() || ""
  const content = (item.contentSnippet || item.description || "").toLowerCase()

  // Check for high-impact keywords
  return impactKeywords.some((keyword) => title.includes(keyword) || content.includes(keyword))
}

// Function to count keywords in text for relevance scoring
export function countKeywords(text: string): number {
  if (!text) return 0

  const lowerText = text.toLowerCase()
  return allKeywords.filter((keyword) => lowerText.includes(keyword)).length
}
