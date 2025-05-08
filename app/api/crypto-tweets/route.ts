import { NextResponse } from "next/server"

// This would be replaced with actual Twitter API calls
export async function GET() {
  // Simulate API response delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const mockTweets = [
    {
      id: "1",
      username: "Crypto Expert",
      handle: "crypto_expert",
      profileImage: "/circuit-elements.png",
      content:
        "Just analyzed the latest Bitcoin chart patterns. We might see a breakout above $65k in the next 24 hours if volume continues to increase. #BTC #TechnicalAnalysis",
      postedAt: new Date().toISOString(),
    },
    {
      id: "2",
      username: "Blockchain Dev",
      handle: "blockchain_dev",
      profileImage: "/abstract-blue-design.png",
      content:
        "The Ethereum upgrade is a game-changer for scalability. Gas fees are down 70% in my tests. This is what mass adoption needs! #ETH #Ethereum",
      postedAt: new Date(Date.now() - 900000).toISOString(),
    },
    {
      id: "3",
      username: "DeFi Watcher",
      handle: "defi_watch",
      profileImage: "/abstract-dw.png",
      content:
        "ALERT: Major exploit detected in a popular DeFi protocol. If you have funds there, withdraw immediately. Details in thread below. #DeFi #CryptoSecurity",
      postedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: "4",
      username: "Crypto News",
      handle: "crypto_news_daily",
      profileImage: "/Chinese-Characters.png",
      content:
        'BREAKING: SEC Commissioner makes positive comments about crypto regulation in latest interview. "We need to embrace innovation while protecting investors." #Regulation #Crypto',
      postedAt: new Date(Date.now() - 2700000).toISOString(),
    },
    {
      id: "5",
      username: "Altcoin Analyst",
      handle: "altcoin_guru",
      profileImage: "/abstract-geometric-shapes.png",
      content:
        "Three altcoins to watch this week: $SOL, $AVAX, and $DOT. Technical indicators suggest potential 20-30% moves. NFA, DYOR. #Altcoins #CryptoTrading",
      postedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ]

  return NextResponse.json({ tweets: mockTweets })
}
