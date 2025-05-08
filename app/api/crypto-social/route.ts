import { NextResponse } from "next/server"

export async function GET() {
  try {
    // In a real implementation, we would:
    // 1. Use Telegram Bot API to fetch messages from WatcherGuru channel
    // 2. Use Twitter/X API to fetch tweets from key crypto influencers
    // 3. Combine and format the data

    // For this demo, we'll simulate with mock data
    const mockPosts = generateMockSocialPosts()

    return NextResponse.json({ posts: mockPosts })
  } catch (error) {
    console.error("Error in crypto social API:", error)
    return NextResponse.json({ posts: [] }, { status: 500 })
  }
}

function generateMockSocialPosts() {
  // Key crypto influencers and sources
  const sources = [
    { name: "WatcherGuru", platform: "Telegram", handle: "WatcherGuru" },
    { name: "Elon Musk", platform: "X", handle: "elonmusk" },
    { name: "Donald Trump", platform: "X", handle: "realDonaldTrump" },
    { name: "Vitalik Buterin", platform: "X", handle: "VitalikButerin" },
    { name: "CZ Binance", platform: "X", handle: "cz_binance" },
    { name: "WhaleAlert", platform: "Telegram", handle: "WhaleAlert" },
    { name: "CoinSignals", platform: "Telegram", handle: "CoinSignals" },
  ]

  const posts = []

  // Generate 1-2 posts per source
  for (const source of sources) {
    const postCount = Math.floor(Math.random() * 2) + 1

    for (let i = 0; i < postCount; i++) {
      // Random time in the last 6 hours
      const randomTime = new Date(Date.now() - Math.floor(Math.random() * 6 * 60 * 60 * 1000))

      posts.push({
        id: `${source.platform}-${source.handle}-${i}-${Date.now()}`,
        author: source.name,
        authorId: source.handle,
        content: getRandomPost(source.name, source.platform),
        postedAt: randomTime.toISOString(),
        source: source.platform,
        url: source.platform === "Telegram" ? `https://t.me/${source.handle}` : `https://x.com/${source.handle}`,
      })
    }
  }

  // Sort by posted time (newest first)
  return posts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
}

function getRandomPost(author: string, platform: string) {
  // WatcherGuru Telegram posts
  const watcherGuruPosts = [
    "JUST IN: Bitcoin hits new all-time high of $99,000.",
    "BREAKING: SEC approves spot Ethereum ETF applications.",
    "ALERT: $250M in Bitcoin moved from unknown wallet to Binance.",
    "JUST IN: Donald Trump promises to make America the crypto capital of the world if elected.",
    "BREAKING: Ethereum successfully completes major network upgrade.",
  ]

  // WhaleAlert Telegram posts
  const whaleAlertPosts = [
    "🚨 🚨 🚨 $120,000,000 #Bitcoin transferred from unknown wallet to #Binance.",
    "🚨 🚨 $85,000,000 #Ethereum transferred from #Binance to unknown wallet.",
    "🚨 $42,000,000 #USDT transferred from #Tether Treasury to #Bitfinex.",
    "🚨 🚨 🚨 $200,000,000 #Bitcoin transferred from unknown wallet to unknown wallet.",
  ]

  // CoinSignals Telegram posts
  const coinSignalsPosts = [
    "BTC/USD: Strong buy signal on the 4h chart. Target: $105,000.",
    "ETH/USD: Breaking out of consolidation. Target: $6,200.",
    "SOL/USD: Bullish divergence on RSI. Target: $180.",
    "ALERT: Market sentiment extremely bullish. Be cautious of potential correction.",
  ]

  // Elon Musk tweets
  const elonMuskTweets = [
    "Dogecoin to the moon! 🚀",
    "Bitcoin is *almost* as BS as fiat money. The key word is *almost*.",
    "The true battle is between fiat & crypto. On balance, I support the latter.",
    "I still own Bitcoin, Ethereum & Doge. That's it.",
  ]

  // Donald Trump tweets
  const trumpTweets = [
    "Bitcoin is TREMENDOUS! We will make America the Crypto Capital of the world!",
    "The digital dollar will be the strongest currency in history. AMERICA FIRST!",
    "Crypto will create MILLIONS of high-paying American jobs. The potential is HUGE!",
    "We will create a strategic Bitcoin reserve. America must lead in crypto!",
  ]

  // Vitalik Buterin tweets
  const vitalikTweets = [
    "Layer 2 scaling solutions are the future of Ethereum. We're seeing incredible progress in rollups technology.",
    "Just published a new blog post on quadratic funding and public goods in crypto. Check it out!",
    "The merge is progressing well. Excited for Ethereum's energy consumption to drop by >99% after the upgrade.",
    "Zero-knowledge proofs are one of the most powerful tools in the cryptographer's toolbox.",
  ]

  // CZ Binance tweets
  const czTweets = [
    "Binance will list $NEW_TOKEN in the Innovation Zone. Trading opens tomorrow.",
    "Security is our top priority. Always enable 2FA and use a hardware wallet for long-term storage.",
    "Just had a great meeting with regulators. Compliance is the way forward for crypto adoption.",
    "Don't trust, verify. Not your keys, not your coins. #BUIDL",
  ]

  // Select appropriate posts based on author and platform
  if (author === "WatcherGuru" && platform === "Telegram") {
    return watcherGuruPosts[Math.floor(Math.random() * watcherGuruPosts.length)]
  } else if (author === "WhaleAlert" && platform === "Telegram") {
    return whaleAlertPosts[Math.floor(Math.random() * whaleAlertPosts.length)]
  } else if (author === "CoinSignals" && platform === "Telegram") {
    return coinSignalsPosts[Math.floor(Math.random() * coinSignalsPosts.length)]
  } else if (author === "Elon Musk" && platform === "X") {
    return elonMuskTweets[Math.floor(Math.random() * elonMuskTweets.length)]
  } else if (author === "Donald Trump" && platform === "X") {
    return trumpTweets[Math.floor(Math.random() * trumpTweets.length)]
  } else if (author === "Vitalik Buterin" && platform === "X") {
    return vitalikTweets[Math.floor(Math.random() * vitalikTweets.length)]
  } else if (author === "CZ Binance" && platform === "X") {
    return czTweets[Math.floor(Math.random() * czTweets.length)]
  } else {
    // Generic crypto posts
    const genericPosts = [
      "Bitcoin forming a classic cup and handle pattern on the 4h chart. If we break $100k with volume, next target is $120k.",
      "Just published a new research paper on scaling solutions for Ethereum. Layer 2 rollups are showing promising results with 100x throughput improvements.",
      "The Bitcoin mempool is getting congested again. Fees are up 40% in the last 24 hours. This bull market is just getting started.",
      "SEC's approach to crypto regulation needs to be more nuanced. Not all tokens are securities, and innovation is being stifled by regulatory uncertainty.",
      "DeFi TVL has crossed $100B again. The ecosystem is maturing with better security practices after the exploits we saw last year.",
    ]
    return genericPosts[Math.floor(Math.random() * genericPosts.length)]
  }
}
