"use client"

import { useEffect, useState } from "react"
import { highlightKeywords } from "@/lib/keywords"

interface SocialPost {
  id: string
  author: string
  authorId: string
  content: string
  postedAt: string
  source: string
  url: string
}

interface SocialFeedStats {
  telegram: {
    count: number
    status: string
  }
  twitter: {
    count: number
    status: string
  }
  total: number
}

export default function SocialFeed() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [stats, setStats] = useState<SocialFeedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSocialPosts = async () => {
      try {
        setLoading(true)
        // Use our own API route instead of directly calling Reddit
        const response = await fetch("/api/social-feed")

        if (!response.ok) {
          throw new Error(`Failed to fetch social posts: ${response.status}`)
        }

        const data = await response.json()

        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts)

          // Set stats if available
          if (data.stats) {
            setStats(data.stats)
          }

          // If there was an error but we got fallback data
          if (data.error) {
            setError(`Warning: Using fallback data. ${data.error}`)
          } else {
            setError(null)
          }
        } else {
          throw new Error("Invalid API response format")
        }
      } catch (error) {
        console.error("Failed to fetch social posts:", error)
        setError(`Error fetching social posts: ${error instanceof Error ? error.message : String(error)}`)

        // Try fallback API as last resort
        try {
          const fallbackResponse = await fetch("/api/crypto-social")
          const fallbackData = await fallbackResponse.json()

          if (fallbackData.posts && Array.isArray(fallbackData.posts)) {
            setPosts(fallbackData.posts)
            setError("Warning: Using mock data due to API failure")
          }
        } catch (fallbackError) {
          console.error("Failed to fetch fallback social posts:", fallbackError)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSocialPosts()
    // Refresh posts every 3 minutes
    const interval = setInterval(fetchSocialPosts, 180000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="p-2 font-mono">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border border-green-900 p-2 text-green-500">
              <div className="flex items-center mb-1">
                <div className="h-3 bg-green-900/20 w-16 mb-1 animate-pulse"></div>
              </div>
              <div className="h-3 bg-green-900/20 w-full mb-1 animate-pulse"></div>
              <div className="h-3 bg-green-900/20 w-full mb-1 animate-pulse"></div>
              <div className="h-3 bg-green-900/20 w-2/3 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && posts.length === 0) {
    return (
      <div className="p-2 font-mono text-red-500 border border-red-900">
        <div className="text-sm">ERROR FETCHING SOCIAL POSTS:</div>
        <div className="text-xs">{error}</div>
        <div className="text-xs mt-2">Retrying in 3 minutes...</div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="p-2 font-mono text-green-500 border border-green-900">
        <div className="text-sm">NO SOCIAL POSTS AVAILABLE</div>
        <div className="text-xs">Waiting for data from social feeds...</div>
      </div>
    )
  }

  return (
    <div className="p-2 font-mono">
      {stats && (
        <div className="text-xs text-green-300 mb-2 border border-green-900 p-1">
          SOURCES: {stats.telegram.count} Telegram ({stats.telegram.status}) | {stats.twitter.count} Twitter (
          {stats.twitter.status}) | {stats.total} Total
          {error && <div className="text-yellow-500 mt-1">{error}</div>}
        </div>
      )}

      <div className="space-y-2">
        {posts.map((post) => (
          <div key={post.id} className="border border-green-900 p-2 text-green-500">
            <div className="mb-1">
              <div className="text-xs font-bold">{post.author}</div>
              <div className="text-xs text-green-300">
                {post.source} • {new Date(post.postedAt).toLocaleTimeString()}
              </div>
            </div>
            <p className="text-xs whitespace-pre-line">{highlightKeywords(post.content)}</p>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-xs mt-1 inline-block hover:underline"
            >
              [VIEW]
            </a>
          </div>
        ))}
      </div>

      {error && <div className="mt-2 p-1 text-xs text-yellow-500 border border-yellow-900">{error}</div>}
    </div>
  )
}
