"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

interface Tweet {
  id: string
  username: string
  handle: string
  profileImage: string
  content: string
  postedAt: string
}

export default function TwitterFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        const response = await fetch("/api/crypto-tweets")
        const data = await response.json()
        setTweets(data.tweets)
        setLoading(false)
      } catch (error) {
        console.error("Failed to fetch tweets:", error)
        setLoading(false)
      }
    }

    fetchTweets()
    // Refresh tweets every 3 minutes
    const interval = setInterval(fetchTweets, 180000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Crypto Twitter</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-gray-900">
              <CardContent className="p-3">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse mr-3"></div>
                  <div>
                    <div className="h-4 bg-gray-800 rounded w-24 mb-1 animate-pulse"></div>
                    <div className="h-3 bg-gray-800 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-800 rounded w-full mb-1 animate-pulse"></div>
                <div className="h-4 bg-gray-800 rounded w-full mb-1 animate-pulse"></div>
                <div className="h-4 bg-gray-800 rounded w-2/3 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Crypto Twitter</h2>
      <div className="space-y-4">
        {tweets.map((tweet) => (
          <Card key={tweet.id} className="bg-gray-900">
            <CardContent className="p-3">
              <div className="flex items-center mb-2">
                <Avatar className="mr-3">
                  <AvatarImage src={tweet.profileImage || "/placeholder.svg"} alt={tweet.username} />
                  <AvatarFallback>{tweet.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{tweet.username}</div>
                  <div className="text-sm text-gray-400">@{tweet.handle}</div>
                </div>
              </div>
              <p className="text-sm">{tweet.content}</p>
              <div className="text-xs text-gray-400 mt-2">{new Date(tweet.postedAt).toLocaleTimeString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
