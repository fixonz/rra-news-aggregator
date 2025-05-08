import { NextResponse } from "next/server"

// This would be replaced with actual API calls to crypto news sources
export async function GET() {
  // Simulate API response delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const mockNews = [
    {
      id: "1",
      title: "Bitcoin Surges Past $60,000 as ETF Approval Rumors Circulate",
      source: "CoinDesk",
      url: "https://example.com/bitcoin-surge",
      publishedAt: new Date().toISOString(),
      summary:
        "Bitcoin has surged past $60,000 amid rumors that the SEC is close to approving a spot Bitcoin ETF. Analysts suggest this could lead to increased institutional adoption.",
      isPriceImpacting: true,
    },
    {
      id: "2",
      title: "Ethereum Completes Major Network Upgrade",
      source: "CryptoNews",
      url: "https://example.com/ethereum-upgrade",
      publishedAt: new Date(Date.now() - 1800000).toISOString(),
      summary:
        "Ethereum has successfully completed its latest network upgrade, improving scalability and reducing gas fees. The upgrade was implemented without any reported issues.",
      isPriceImpacting: false,
    },
    {
      id: "3",
      title: "Major Bank Announces Crypto Custody Services",
      source: "Bloomberg",
      url: "https://example.com/bank-crypto",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      summary:
        "A major international bank has announced plans to offer cryptocurrency custody services to institutional clients, marking a significant step in mainstream adoption.",
      isPriceImpacting: false,
    },
    {
      id: "4",
      title: "Regulatory Concerns Grow as Countries Consider New Crypto Laws",
      source: "Reuters",
      url: "https://example.com/crypto-regulations",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      summary:
        "Several countries are considering new regulatory frameworks for cryptocurrencies, raising concerns about potential restrictions on trading and ownership.",
      isPriceImpacting: true,
    },
    {
      id: "5",
      title: "New DeFi Protocol Reaches $1 Billion in Total Value Locked",
      source: "DeFi Pulse",
      url: "https://example.com/defi-billion",
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      summary:
        "A new decentralized finance protocol has reached $1 billion in total value locked just two weeks after launch, highlighting the continued growth of the DeFi sector.",
      isPriceImpacting: false,
    },
  ]

  return NextResponse.json({ news: mockNews })
}
