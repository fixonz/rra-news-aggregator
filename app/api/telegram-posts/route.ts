import { NextResponse } from "next/server"
import * as cheerio from "cheerio"

// Telegram Bot API endpoint
const TELEGRAM_API = "https://api.telegram.org/bot"
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Channels to monitor
const TELEGRAM_CHANNELS = [
  "WatcherGuru", // Main channel requested
  "whale_alert_io", // Whale Alert channel
  "CryptoCoiners", // Crypto news channel
  "CoingraphNews", // Added
  "news_crypto",   // Added
]

export async function GET() {
  try {
    // Array to store posts from all channels
    const allPosts = []

    // Fetch messages from each channel using web scraping
    for (const channelUsername of TELEGRAM_CHANNELS) {
      try {
        const channelPosts = await scrapePublicChannel(channelUsername)
        allPosts.push(...channelPosts)
      } catch (channelError) {
        console.error(`Error fetching from ${channelUsername}:`, channelError)
      }
    }

    // Sort by posted time (newest first)
    const sortedPosts = allPosts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())

    return NextResponse.json({ posts: sortedPosts })
  } catch (error) {
    console.error("Error in Telegram API:", error)
    return NextResponse.json(
      {
        posts: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * Scrape a public Telegram channel using the web version
 */
async function scrapePublicChannel(channelUsername: string) {
  try {
    console.log(`Scraping Telegram channel: ${channelUsername}`)

    // Fetch the public web version of the channel
    const response = await fetch(`https://t.me/s/${channelUsername}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch channel ${channelUsername}: ${response.status}`)
    }

    const html = await response.text()

    // Use cheerio to parse the HTML
    const $ = cheerio.load(html)

    const messages = []

    // Find message containers
    $(".tgme_widget_message_wrap").each((i, elem) => {
      try {
        const messageElement = $(elem).find(".tgme_widget_message_text");
        // Preserve line breaks by replacing <br> with newline before getting text
        messageElement.find('br').replaceWith('\n');
        let messageText = messageElement.text().trim();

        // Remove @username mentions
        messageText = messageText.replace(/@\w+/g, '').trim();
        // Remove "Telegram | Twitter" suffix (case-insensitive, allows spaces)
        messageText = messageText.replace(/\s*\|?\s*Telegram\s*\|\s*Twitter\s*$/i, '').trim();

        // Skip empty messages after cleaning
        if (!messageText) return;

        const messageDate = $(elem).find(".tgme_widget_message_date time").attr("datetime")
        const messageLink = $(elem).find(".tgme_widget_message_date").attr("href")

        // Extract message ID from the link
        const messageId = messageLink ? messageLink.split("/").pop() : `${Date.now()}-${i}`

        // Get display name from the channel page
        const channelName = $(".tgme_channel_info_header_title").text().trim() || getDisplayName(channelUsername)

        messages.push({
          id: `telegram-${channelUsername}-${messageId}`,
          author: channelName,
          authorId: channelUsername,
          content: messageText,
          postedAt: messageDate ? new Date(messageDate).toISOString() : new Date().toISOString(),
          source: "Telegram",
          url: messageLink || `https://t.me/${channelUsername}`,
        })
      } catch (messageError) {
        console.error(`Error parsing message in ${channelUsername}:`, messageError)
      }
    })

    console.log(`Scraped ${messages.length} messages from ${channelUsername}`)
    return messages
  } catch (error) {
    console.error(`Error scraping channel ${channelUsername}:`, error)
    return []
  }
}

/**
 * Get a display name for a channel username
 */
function getDisplayName(username: string) {
  // Convert username to a more readable display name
  const displayNames: Record<string, string> = {
    WatcherGuru: "Watcher Guru",
    whale_alert_io: "Whale Alert",
    CryptoCoiners: "Crypto Coiners",
    CoingraphNews: "Coingraph News",
    news_crypto: "Crypto News",
  }

  return displayNames[username] || username
}
