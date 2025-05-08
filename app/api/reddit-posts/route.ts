import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Fetch from Reddit API server-side (no CORS issues here)
    const response = await fetch("https://www.reddit.com/r/CryptoCurrency/hot.json?limit=10")

    if (!response.ok) {
      throw new Error(`Failed to fetch Reddit posts: ${response.status}`)
    }

    const data = await response.json()

    if (data.data && Array.isArray(data.data.children)) {
      const redditPosts = data.data.children.map((post: any) => ({
        id: post.data.id,
        author: post.data.author,
        authorId: post.data.author_fullname || post.data.author,
        content:
          post.data.title +
          (post.data.selftext
            ? `\n${post.data.selftext.substring(0, 200)}${post.data.selftext.length > 200 ? "..." : ""}`
            : ""),
        postedAt: new Date(post.data.created_utc * 1000).toISOString(),
        source: "Reddit",
        url: `https://reddit.com${post.data.permalink}`,
      }))

      return NextResponse.json({ posts: redditPosts })
    } else {
      throw new Error("Invalid Reddit API response format")
    }
  } catch (error) {
    console.error("Error fetching Reddit posts:", error)

    // Return mock data as fallback
    return NextResponse.json({
      posts: generateMockSocialPosts(),
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// Generate mock social posts as fallback
function generateMockSocialPosts() {
  const sources = ["Reddit", "Forum", "Discord"]
  const users = ["CryptoEnthusiast", "BitcoinMaximalist", "ETHTrader", "AltcoinAnalyst", "DeFiDeveloper"]

  const posts = []

  // Generate 10 mock posts
  for (let i = 0; i < 10; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)]
    const user = users[Math.floor(Math.random() * users.length)]

    // Random time in the last 12 hours
    const randomTime = new Date(Date.now() - Math.floor(Math.random() * 12 * 60 * 60 * 1000))

    posts.push({
      id: `mock-${i}-${Date.now()}`,
      author: user,
      authorId: user.toLowerCase(),
      content: getRandomPost(),
      postedAt: randomTime.toISOString(),
      source: source,
      url: `https://example.com/${source.toLowerCase()}/${user.toLowerCase()}`,
    })
  }

  // Sort by posted time (newest first)
  return posts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
}

function getRandomPost() {
  const posts = [
    "Bitcoin forming a classic cup and handle pattern on the 4h chart. If we break $65k with volume, next target is $72k.",
    "Just published a new research paper on scaling solutions for Ethereum. Layer 2 rollups are showing promising results with 100x throughput improvements.",
    "The Bitcoin mempool is getting congested again. Fees are up 40% in the last 24 hours. This bull market is just getting started.",
    "SEC's approach to crypto regulation needs to be more nuanced. Not all tokens are securities, and innovation is being stifled by regulatory uncertainty.",
    "DeFi TVL has crossed $100B again. The ecosystem is maturing with better security practices after the exploits we saw last year.",
    "Treasury yields inverting again. Historically this has been bullish for Bitcoin in the 6-12 months that follow.",
    "Governance proposal passed with 92% approval. The protocol will now allocate 20% of fees to insurance fund.",
    "Long-term analysis of Bitcoin's stock-to-flow model suggests we're still undervalued compared to previous cycles.",
    "The regulatory landscape for stablecoins is evolving rapidly. Projects with strong compliance teams will have an advantage.",
    "Zero-knowledge proofs are the future of blockchain privacy and scaling. The math is complex but the applications are revolutionary.",
    "Analyzing on-chain data shows accumulation by long-term holders is at all-time highs despite price volatility.",
    "Cross-chain bridges remain a security vulnerability. Over $2B lost to bridge hacks in the past 18 months.",
  ]

  return posts[Math.floor(Math.random() * posts.length)]
}
