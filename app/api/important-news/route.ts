import { NextResponse } from "next/server"

// Define a simple structure for what we expect from /api/crypto-prices for BTC
interface BitcoinPriceResponse {
  prices: Array<{
    symbol: string;
    price: number;
  }>;
  error?: string;
}

export async function GET() {
  try {
    // Fetch current Bitcoin price from our own /api/crypto-prices endpoint
    // Construct the absolute URL for server-side fetching
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const priceApiUrl = new URL("/api/crypto-prices", baseUrl);
    
    const response = await fetch(priceApiUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch Bitcoin price from internal API /api/crypto-prices: ${response.status} - ${errorText}`);
    }

    const priceData = (await response.json()) as BitcoinPriceResponse;

    if (priceData.error) {
      throw new Error(`Error from /api/crypto-prices: ${priceData.error}`);
    }
    
    const bitcoinInfo = priceData.prices?.find(p => p.symbol === "BTC");
    const bitcoinPrice = bitcoinInfo?.price || 0;

    if (bitcoinPrice === 0 && !bitcoinInfo) {
      console.warn("BTC price not found in /api/crypto-prices response for important-news API. PriceData:", JSON.stringify(priceData));
    }

    // --- IMPORTANT NEWS LOGIC ---
    let importantNews = null;
    const KNOWN_BTC_ATH_USD = 108786; // Placeholder - UPDATE THIS WITH A RECENT ATH VALUE!

    // Randomly decide whether to return important news (for demo purposes)
    const hasImportantNews = Math.random() > 0.7; // 30% chance of an alert

    if (hasImportantNews && bitcoinPrice > 0) {
      if (bitcoinPrice > KNOWN_BTC_ATH_USD * 1.005) { // If current price is >0.5% above known ATH
        importantNews = `ATH ALERT: Bitcoin breaks past $${KNOWN_BTC_ATH_USD.toLocaleString()}! Currently trading at $${Math.round(bitcoinPrice).toLocaleString()}!`;
      } else if (bitcoinPrice > KNOWN_BTC_ATH_USD * 0.98) { // Within 2% of known ATH
        importantNews = `PRICE WATCH: Bitcoin nearing its ATH of ~$${KNOWN_BTC_ATH_USD.toLocaleString()}, currently at $${Math.round(bitcoinPrice).toLocaleString()}`;
      } else if (bitcoinPrice > 85000) { // Using a high, but not necessarily ATH, threshold
        importantNews = `ALERT: Bitcoin price soaring, currently trading at $${Math.round(bitcoinPrice).toLocaleString()}`;
      } else if (bitcoinPrice > 75000) {
        importantNews = `NOTICE: Bitcoin showing strong momentum, currently at $${Math.round(bitcoinPrice).toLocaleString()}`;
      } else if (Math.random() < 0.25) { // 25% chance of one of the generic alerts if no price trigger
        const genericAlerts = [
          `REGULATORY UPDATE: SEC Chair to discuss new crypto oversight measures next week.`,
          `ADOPTION NEWS: Major financial institution announces Bitcoin ETF plans.`,
          `TECH DEVELOPMENT: Ethereum Layer-2 solution reports significant performance upgrade.`,
          `SECURITY ALERT: Users of XYZ wallet advised to update due to a potential vulnerability.`,
        ];
        importantNews = genericAlerts[Math.floor(Math.random() * genericAlerts.length)];
      }
    } else if (hasImportantNews && bitcoinPrice === 0) { // Fallback if BTC price is missing
        const genericAlerts = [
          `REGULATORY UPDATE: Discussions ongoing for global crypto framework.`,
          `TECH DEVELOPMENT: New consensus mechanism proposed for upcoming blockchain.`,
        ];
        importantNews = genericAlerts[Math.floor(Math.random() * genericAlerts.length)];
    }

    return NextResponse.json({
      importantNews,
      bitcoinPrice,
    })
  } catch (error) {
    console.error("Error in important news API:", error)
    return NextResponse.json({ importantNews: null }, { status: 500 })
  }
}
