# Crypto Terminal

A real-time crypto news and price terminal with data from:
- RSS feeds from major crypto news sites
- Telegram channels (including @WatcherGuru)
- Twitter/X accounts (Elon Musk, Trump, Vitalik, CZ)
- CoinGecko API for real-time prices

## Setup

1. Create a `.env.local` file with the following variables:

\`\`\`
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Twitter API Credentials
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# App URL (for API routes)
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

2. For Telegram integration:
   - Create a Telegram bot using BotFather
   - Add the bot to the channels you want to monitor
   - Get the bot token and add it to `.env.local`

3. For Twitter integration:
   - Create a Twitter developer account
   - Create a Twitter app
   - Generate API keys and access tokens
   - Add them to `.env.local`

## Running the app

\`\`\`bash
npm install
npm run dev
\`\`\`

## Security Notes

- Keep your API keys and tokens secure
- Do not commit `.env.local` to version control
- Rotate your keys periodically
