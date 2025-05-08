import { NextResponse } from "next/server"

export async function GET() {
  try {
    // In a real app, we would use a service like Nitter RSS feeds or a Twitter API wrapper
    // that provides RSS-like functionality for Twitter/X accounts

    // List of crypto influencer handles to track
    const cryptoInfluencers = [
      "VitalikButerin",
      "cz_binance",
      "SBF_FTX",
      "elonmusk",
      "michael_saylor",
      "CryptoHayes",
      "aantonop",
      "PeterLBrandt",
      "WClementeIII",
      "CryptoCred",
      "MessariCrypto",
      "RaoulGMI",
      "CryptoYoda1338",
      "CryptoWendyO",
      "TheCryptoLark",
    ]

    // Simulate fetching tweets from these accounts
    // In production, you would use a service that converts Twitter feeds to RSS
    // or use the Twitter API directly

    // For demo purposes, we'll generate mock tweets
    const mockTweets = generateMockTweets(cryptoInfluencers)

    return NextResponse.json({ tweets: mockTweets })
  } catch (error) {
    console.error("Error in RSS social API:", error)
    return NextResponse.json({ tweets: [] }, { status: 500 })
  }
}

function generateMockTweets(handles: string[]) {
  const tweets = []

  // Generate 1-3 tweets per handle
  for (const handle of handles) {
    const tweetCount = Math.floor(Math.random() * 3) + 1

    for (let i = 0; i < tweetCount; i++) {
      // Random time in the last 12 hours
      const randomTime = new Date(Date.now() - Math.floor(Math.random() * 12 * 60 * 60 * 1000))

      tweets.push({
        id: `${handle}-${i}-${Date.now()}`,
        username: getDisplayName(handle),
        handle: handle,
        profileImage: `/crypto-avatars/${handle.toLowerCase()}.png`,
        content: getRandomTweet(handle),
        postedAt: randomTime.toISOString(),
      })
    }
  }

  // Sort by posted time (newest first)
  return tweets.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
}

function getDisplayName(handle: string) {
  // Convert handle to a more readable display name
  const displayNames: Record<string, string> = {
    VitalikButerin: "Vitalik Buterin",
    cz_binance: "CZ Binance",
    SBF_FTX: "Sam Bankman-Fried",
    elonmusk: "Elon Musk",
    michael_saylor: "Michael Saylor",
    CryptoHayes: "Arthur Hayes",
    aantonop: "Andreas Antonopoulos",
    PeterLBrandt: "Peter Brandt",
    WClementeIII: "Will Clemente",
    CryptoCred: "Cred",
    MessariCrypto: "Messari",
    RaoulGMI: "Raoul Pal",
    CryptoYoda1338: "Crypto Yoda",
    CryptoWendyO: "Wendy O",
    TheCryptoLark: "The Crypto Lark",
  }

  return displayNames[handle] || handle
}

function getRandomTweet(handle: string) {
  const tweetsByHandle: Record<string, string[]> = {
    VitalikButerin: [
      "Layer 2 scaling solutions are the future of Ethereum. We're seeing incredible progress in rollups technology.",
      "Just published a new blog post on quadratic funding and public goods in crypto. Check it out!",
      "The merge is progressing well. Excited for Ethereum's energy consumption to drop by >99% after the upgrade.",
    ],
    cz_binance: [
      "Binance will list $NEW_TOKEN in the Innovation Zone. Trading opens tomorrow. Regulatory compliance is our priority.",
      "Security is our top priority. Always enable 2FA and use a hardware wallet for long-term storage to avoid hacks.",
      "Just had a great meeting with regulators in Singapore. Compliance is the way forward for crypto adoption.",
    ],
    elonmusk: [
      "Dogecoin might be my favorite cryptocurrency. It's pretty cool. To the moon! 🚀",
      "The future currency of Earth will be crypto. But which one? The market will decide. 🤔",
      "BTC & ETH are looking solid in this bull market. And Doge of course.",
    ],
    michael_saylor: [
      "Bitcoin is digital energy. It's the most efficient way to store value across time and space. No security breaches in 14 years.",
      "Just acquired another 5,000 BTC for our treasury. We now hold over 125,000 bitcoin. Institutional adoption continues.",
      "Fiat currencies are melting ice cubes. Bitcoin is a monetary glacier. The technical fundamentals remain strong.",
    ],
  }

  // Default tweets for handles not specifically defined
  const defaultTweets = [
    "Just analyzed the BTC chart. We might see a breakout above resistance soon. The technical indicators are bullish. NFA.",
    "This altcoin season is just getting started. My top picks: $ETH, $SOL, $AVAX. The market is showing strength.",
    "Don't forget to take profits on the way up. Bull markets don't last forever. Security of your funds should be priority #1.",
    "DeFi TVL has grown 40% in the last month. The ecosystem is thriving despite regulatory uncertainty.",
    "Remember: Not your keys, not your coins. Always self-custody your crypto when possible to avoid exchange hacks.",
    "The weekly RSI is showing oversold conditions. Potential price surge incoming based on technical analysis.",
    "Layer 1 competition is heating up with new protocol upgrades. But Ethereum's network effects are still unmatched.",
    "NFTs are more than just JPEGs. The technology enables true digital ownership in the metaverse.",
    "Staking yields on $POS_COIN have increased to 12% APY. Great passive income opportunity in this market.",
  ]

  const tweets = tweetsByHandle[handle] || defaultTweets
  return tweets[Math.floor(Math.random() * tweets.length)]
}
