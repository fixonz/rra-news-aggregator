import { NextResponse } from "next/server";

interface FearGreedData {
  value: string;
  value_classification: string;
  last_updated: string;
  // timestamp: string; // From original API, might not be needed for static
  // time_until_update?: string; // From original API
}

export async function GET() {
  // Static data as per user's information for now
  // In the future, this could fetch from the API once daily and cache
  const staticData: FearGreedData = {
    value: "30",
    value_classification: "Fear",
    last_updated: new Date().toISOString(), // Use current time as last_updated for now
  };

  try {
    return NextResponse.json(staticData);
  } catch (error) {
    console.error("Error in fear-greed API:", error);
    return NextResponse.json(
      {
        error: "Failed to serve Fear & Greed data",
      },
      { status: 500 },
    );
  }
} 