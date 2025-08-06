import { NextResponse } from "next/server";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  coinGeckoId: string;
}

interface ImportantNewsAlert {
  type:
    | "price_movement"
    | "news_correlation"
    | "market_event"
    | "regulatory"
    | "technical";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  affectedAssets: string[];
  timestamp: string;
  source?: string;
  relatedNewsId?: string;
}

export async function GET() {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    // Fetch current prices
    const priceResponse = await fetch(`${baseUrl}/api/crypto-prices`);
    if (!priceResponse.ok) {
      throw new Error(`Failed to fetch prices: ${priceResponse.status}`);
    }
    const priceJson = await priceResponse.json();
    const prices = Array.isArray(priceJson.prices) ? priceJson.prices : [];

    // Fetch recent news
    const newsResponse = await fetch(`${baseUrl}/api/rss-news`);
    const newsData = newsResponse.ok
      ? await newsResponse.json()
      : { news: [] };
    const recentNews = Array.isArray(newsData.news) ? newsData.news : [];

    // Fetch price analysis
    const analysisResponse = await fetch(
      `${baseUrl}/api/price-analysis?correlations=true`
    );
    const analysisData = analysisResponse.ok
      ? await analysisResponse.json()
      : { alerts: [], correlations: [], marketSummary: null };
    const correlations = Array.isArray(analysisData.correlations)
      ? analysisData.correlations
      : [];
    const alertsData = Array.isArray(analysisData.alerts)
      ? analysisData.alerts
      : [];
    const marketSummary = analysisData.marketSummary || null;

    const alerts: ImportantNewsAlert[] = [];

    // 1. Price Movement Alerts
    prices.forEach((coin: PriceData) => {
      if (
        typeof coin.change24h === "number" &&
        Math.abs(coin.change24h) > 15
      ) {
        alerts.push({
          type: "price_movement",
          severity:
            Math.abs(coin.change24h) > 25 ? "critical" : "high",
          title: `${coin.symbol} ${
            coin.change24h > 0 ? "Surges" : "Drops"
          } ${Math.abs(coin.change24h).toFixed(1)}%`,
          message: `${coin.symbol} is ${
            coin.change24h > 0 ? "up" : "down"
          } ${Math.abs(coin.change24h).toFixed(
            1
          )}% in the last 24 hours, currently trading at $${coin.price.toLocaleString()}`,
          affectedAssets: [coin.symbol],
          timestamp: new Date().toISOString(),
        });
      }

      // ATH alerts for major coins
      const knownATHs: Record<string, number> = {
        BTC: 108786,
        ETH: 4878,
        BNB: 686,
        SOL: 259,
        ADA: 3.09,
      };

      if (
        knownATHs[coin.symbol] &&
        typeof coin.price === "number" &&
        coin.price > knownATHs[coin.symbol] * 0.98
      ) {
        alerts.push({
          type: "price_movement",
          severity:
            coin.price > knownATHs[coin.symbol] ? "critical" : "high",
          title: `${coin.symbol} ${
            coin.price > knownATHs[coin.symbol] ? "Breaks ATH!" : "Nearing ATH"
          }`,
          message: `${coin.symbol} is ${
            coin.price > knownATHs[coin.symbol] ? "now trading above" : "approaching"
          } its all-time high of $${knownATHs[coin.symbol].toLocaleString()}, currently at $${coin.price.toLocaleString()}`,
          affectedAssets: [coin.symbol],
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 2. News Correlation Alerts
    correlations.forEach((correlation: any) => {
      if (
        correlation &&
        typeof correlation.overallMarketImpact === "number" &&
        Math.abs(correlation.overallMarketImpact) > 5
      ) {
        alerts.push({
          type: "news_correlation",
          severity:
            Math.abs(correlation.overallMarketImpact) > 15
              ? "critical"
              : "high",
          title: "News Impact Detected",
          message: `Recent news "${
            correlation.newsTitle?.substring(0, 100) ?? ""
          }..." appears to be impacting ${
            Array.isArray(correlation.affectedCoins)
              ? correlation.affectedCoins.length
              : 0
          } cryptocurrencies with an average ${
            correlation.overallMarketImpact > 0 ? "positive" : "negative"
          } impact of ${Math.abs(correlation.overallMarketImpact).toFixed(1)}%`,
          affectedAssets: Array.isArray(correlation.affectedCoins)
            ? correlation.affectedCoins.map((coin: any) => coin.symbol)
            : [],
          timestamp: new Date().toISOString(),
          relatedNewsId: correlation.newsId,
        });
      }
    });

    // 3. Market Event Alerts
    if (marketSummary) {
      if (
        Array.isArray(marketSummary.majorMovers) &&
        marketSummary.majorMovers.length > 3
      ) {
        alerts.push({
          type: "market_event",
          severity: "medium",
          title: "High Market Volatility",
          message: `Multiple cryptocurrencies showing significant movements: ${marketSummary.majorMovers
            .slice(0, 5)
            .join(", ")}. Overall market sentiment: ${
            marketSummary.overallSentiment ?? "neutral"
          }`,
          affectedAssets: marketSummary.majorMovers,
          timestamp: new Date().toISOString(),
        });
      }

      if (
        typeof marketSummary.btcDominance === "number" &&
        marketSummary.btcDominance > 60
      ) {
        alerts.push({
          type: "market_event",
          severity: "medium",
          title: "Bitcoin Dominance High",
          message: `Bitcoin dominance is at ${marketSummary.btcDominance}%, indicating potential altcoin weakness or Bitcoin strength`,
          affectedAssets: ["BTC"],
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 4. Regulatory Alerts (from news analysis)
    const regulatoryKeywords = [
      "sec",
      "regulation",
      "regulatory",
      "ban",
      "legal",
      "government",
      "policy",
    ];

    recentNews.slice(0, 10).forEach((news: any) => {
      if (news && news.isPriceImpacting) {
        const title = (news.title ?? "").toLowerCase();
        const hasRegulatoryKeyword = regulatoryKeywords.some((keyword) =>
          title.includes(keyword)
        );

        if (hasRegulatoryKeyword) {
          alerts.push({
            type: "regulatory",
            severity: "high",
            title: "Regulatory Development",
            message: news.title ?? "",
            affectedAssets: extractMentionedAssets(
              (news.title ?? "") + " " + (news.summary ?? "")
            ),
            timestamp: news.publishedAt ?? new Date().toISOString(),
            source: news.source,
            relatedNewsId: news.id,
          });
        }
      }
    });

    // 5. Technical Analysis Alerts
    alertsData
      .filter(
        (alert: any) =>
          alert &&
          (alert.significance === "critical" || alert.significance === "high")
      )
      .forEach((alert: any) => {
        alerts.push({
          type: "technical",
          severity: alert.significance,
          title: `${alert.symbol} ${alert.alertType
            .replace("_", " ")
            .toUpperCase()}`,
          message: `${alert.symbol} showing ${alert.alertType.replace(
            "_",
            " "
          )} with ${alert.changePercentage.toFixed(1)}% change in ${
            alert.timeframe
          }`,
          affectedAssets: [alert.symbol],
          timestamp: alert.timestamp,
        });
      });

    // Sort alerts by severity and timestamp
    alerts.sort((a, b) => {
      const severityOrder: Record<string, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      return (
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    // Return the most important alert and summary
    const primaryAlert = alerts.length > 0 ? alerts[0] : null;
    const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
    const highAlerts = alerts.filter((alert) => alert.severity === "high");

    let importantNews = null;
    if (primaryAlert) {
      if (criticalAlerts.length > 1) {
        importantNews = `CRITICAL: Multiple major events detected - ${primaryAlert.title} and ${
          criticalAlerts.length - 1
        } other critical alerts`;
      } else {
        importantNews = primaryAlert.title + ": " + primaryAlert.message;
      }
    }

    return NextResponse.json({
      importantNews,
      alerts: alerts.slice(0, 10), // Return top 10 alerts
      summary: {
        total: alerts.length,
        critical: criticalAlerts.length,
        high: highAlerts.length,
        marketSentiment: marketSummary?.overallSentiment || "neutral",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in enhanced important news:", error);
    return NextResponse.json(
      {
        importantNews: "Unable to fetch market analysis - system error",
        alerts: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to extract mentioned cryptocurrency assets from text
function extractMentionedAssets(text: string): string[] {
  const assets = [
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "ADA",
    "AVAX",
    "DOT",
    "LINK",
    "MATIC",
    "UNI",
    "LTC",
    "DOGE",
    "SHIB",
    "XRP",
    "TRX",
  ];
  const mentioned: string[] = [];
  const lowerText = text.toLowerCase();

  // Check for symbol mentions
  assets.forEach((asset) => {
    if (
      lowerText.includes(asset.toLowerCase()) ||
      lowerText.includes("$" + asset.toLowerCase())
    ) {
      mentioned.push(asset);
    }
  });

  // Check for name mentions
  const nameMap: Record<string, string> = {
    bitcoin: "BTC",
    ethereum: "ETH",
    binance: "BNB",
    solana: "SOL",
    cardano: "ADA",
    avalanche: "AVAX",
    polkadot: "DOT",
    chainlink: "LINK",
    polygon: "MATIC",
    uniswap: "UNI",
    litecoin: "LTC",
    dogecoin: "DOGE",
    shiba: "SHIB",
    ripple: "XRP",
    tron: "TRX",
  };

  Object.entries(nameMap).forEach(([name, symbol]) => {
    if (lowerText.includes(name) && !mentioned.includes(symbol)) {
      mentioned.push(symbol);
    }
  });

  return mentioned;
}
