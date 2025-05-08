import { NextResponse } from "next/server"
// No longer using crypto for OAuth1.0a
// import crypto from "crypto"

// X API v2 Bearer Token from environment variable
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN

// Twitter accounts to monitor (usernames)
const X_USERNAMES = ["elonmusk", "VitalikButerin", "cz_binance", "WatcherGuru"] // Added WatcherGuru as an example

// Define interfaces for API responses (simplified)
interface XUser {
  id: string
  name: string
  username: string
}

interface XTweet {
  id: string
  text: string
  created_at?: string
  author_id?: string // Usually included via expansions
}

interface TweetPost {
  id: string
  author: string
  authorId: string
  content: string
  postedAt: string
  source: "X" // Changed from "Twitter"
  url: string
}

interface UserCacheEntry {
  timestamp: number
  users: Record<string, XUser> // Store by username
}

interface TweetsCacheEntry {
  timestamp: number
  tweets: TweetPost[]
}

const USER_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours for user ID mapping
const TWEETS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for tweets

let userCache: UserCacheEntry | null = null
let tweetsCache: TweetsCacheEntry | null = null

// Keep fetchUserIds function definition for potential future use, but don't call it by default
async function fetchUserIds(usernames: string[]): Promise<Record<string, XUser>> {
  if (userCache && (Date.now() - userCache.timestamp < USER_CACHE_DURATION)) {
    // Check if all requested usernames are in cache
    const allFound = usernames.every(u => userCache!.users[u.toLowerCase()])
    if (allFound) {
      console.log("Returning cached user IDs for X accounts")
      return userCache.users
    }
  }
  console.log("Fetching fresh user IDs for X accounts")

  if (!X_BEARER_TOKEN) {
    console.error("X_BEARER_TOKEN is not configured.")
    throw new Error("X API Bearer token not configured.")
  }

  const endpoint = `https://api.twitter.com/2/users/by?usernames=${usernames.join(",")}`
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${X_BEARER_TOKEN}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`X API error (fetchUserIds: ${response.status}):`, errorText)
    throw new Error(`X API error fetching user IDs: ${response.status} - ${errorText}`)
  }

  const { data } = (await response.json()) as { data: XUser[] }
  const usersMap: Record<string, XUser> = {}
  if (data) {
    data.forEach(user => {
      usersMap[user.username.toLowerCase()] = user
    })
  }
  
  userCache = { timestamp: Date.now(), users: usersMap }
  return usersMap
}

export async function GET() {
  // --- MODIFICATION START: Always return mock data for now ---
  console.warn("X API v2 calls disabled due to rate limits. Returning mock X data.");
  return NextResponse.json({
    posts: generateMockXPosts(), 
    status: "mock",
    message: "Using mock X data (API v2 disabled due to rate limits)",
  });
  // --- MODIFICATION END ---

/* Original API v2 logic commented out below for potential future use
  if (!X_BEARER_TOKEN) {
    console.warn("X_BEARER_TOKEN not configured, using mock X data")
    return NextResponse.json({
      posts: generateMockXPosts(), // Renamed for clarity
      status: "mock",
      message: "Using mock X data (X_BEARER_TOKEN not configured)",
    })
  }

  try {
    if (tweetsCache && (Date.now() - tweetsCache.timestamp < TWEETS_CACHE_DURATION)) {
      console.log("Returning cached X posts")
      return NextResponse.json({ posts: tweetsCache.tweets, status: "live_cached" })
    }
    console.log("Fetching fresh X posts, cache expired or empty")

    const usersMap = await fetchUserIds(X_USERNAMES)
    const allFormattedTweets: TweetPost[] = []

    for (const username of X_USERNAMES) {
      const user = usersMap[username.toLowerCase()]
      if (!user) {
        console.warn(`User ID for ${username} not found.`)
        continue
      }

      // Fetch tweets for the user ID
      // Added tweet.fields and expansions for more data
      const tweetsEndpoint = `https://api.twitter.com/2/users/${user.id}/tweets?max_results=5&tweet.fields=created_at,text&expansions=author_id`
      const tweetsResponse = await fetch(tweetsEndpoint, {
        headers: {
          Authorization: `Bearer ${X_BEARER_TOKEN}`,
        },
      })

      if (!tweetsResponse.ok) {
        const errorText = await tweetsResponse.text()
        console.error(`X API error (fetch tweets for ${username}, ${user.id}, ${tweetsResponse.status}):`, errorText)
        // Don't throw, try next user, or use mock for this user?
        // For now, we'll just skip this user on error.
        continue 
      }

      const tweetsData = (await tweetsResponse.json()) as { data?: XTweet[]; includes?: { users?: XUser[] } }
      
      if (tweetsData.data) {
        tweetsData.data.forEach(tweet => {
          const authorInfo = tweetsData.includes?.users?.find(u => u.id === tweet.author_id) || user // Fallback to fetched user if not in includes
          allFormattedTweets.push({
            id: `x-${tweet.id}`,
            author: authorInfo.name,
            authorId: authorInfo.username,
            content: tweet.text,
            postedAt: tweet.created_at || new Date().toISOString(),
            source: "X",
            url: `https://twitter.com/${authorInfo.username}/status/${tweet.id}`,
          })
        })
      }
    }

    if (allFormattedTweets.length === 0) {
        // This could happen if all user lookups fail or they have no recent tweets
        // Or if API calls fail silently and we `continue`
        console.warn("No X posts fetched from API. Returning mock data as fallback.")
        return NextResponse.json({ posts: generateMockXPosts(), status: "mock", message: "No posts from API, using mock.", })
    }

    // Sort by date before caching and returning
    allFormattedTweets.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())

    tweetsCache = { timestamp: Date.now(), tweets: allFormattedTweets }

    return NextResponse.json({
      posts: allFormattedTweets,
      status: "live_api",
    })

  } catch (error) {
    console.error("Error in X API v2 processing:", error)
    return NextResponse.json(
      {
        posts: generateMockXPosts(),
        status: "mock",
        error: error instanceof Error ? error.message : "Unknown error fetching X posts",
      },
      { status: 200 } // Return 200 even with mock data for social-feed to handle it
    )
  }
*/
}

// Renamed function and updated to reflect X source
function generateMockXPosts(): TweetPost[] {
  const mockPosts: TweetPost[] = []
  X_USERNAMES.forEach(username => {
    for (let i = 0; i < 2; i++) { // Generate 2 mock posts per account
      mockPosts.push({
        id: `mock-x-${username}-${i}-${Date.now()}`,
        author: username, // Simplified for mock
        authorId: username,
        content: `This is a mock X post from ${username} (${new Date().toLocaleTimeString()}). Check out the latest updates! #crypto #blockchain`,
        postedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
        source: "X",
        url: `https://twitter.com/${username}`,
      })
    }
  })
  return mockPosts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
}

// Removed old OAuth 1.0a related code (TWITTER_API_KEY, etc.) and TWITTER_ACCOUNTS
// Removed getDisplayName and getMockTweetContent specific to old structure
