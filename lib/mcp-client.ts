import { EventSource } from 'eventsource';

const MCP_ENDPOINT = 'https://mcp.api.coingecko.com/sse';
const TOP_COINS = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'dogecoin', 'ripple', 'cardano', 'avalanche-2', 'tron', 'shiba-inu',
  'litecoin', 'polkadot', 'matic-network', 'uniswap', 'chainlink', 'stellar', 'bitcoin-cash', 'filecoin', 'aptos', 'arbitrum', 'optimism'
];

// In-memory store for latest MCP prices
let mcpPrices: Record<string, { price: number; change24h: number; lastUpdate: number }> = {};
let mcpReady = false;
let mcpInit = false;

function startMcpClient() {
  if (mcpInit) return;
  mcpInit = true;
  const es = new EventSource(MCP_ENDPOINT);
  es.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'price_update' && TOP_COINS.includes(data.id)) {
        mcpPrices[data.id] = {
          price: data.current_price,
          change24h: data.price_change_percentage_24h || 0,
          lastUpdate: Date.now()
        };
        mcpReady = true;
      }
    } catch {}
  };
  es.onerror = () => {
    mcpReady = false;
    // Try to reconnect after a short delay
    setTimeout(() => {
      mcpInit = false;
      startMcpClient();
    }, 5000);
  };
}

export function getMcpPrices() {
  if (!mcpInit) startMcpClient();
  return { prices: mcpPrices, ready: mcpReady };
}
