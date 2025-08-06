"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Loader2, Send, Hourglass, ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, CircleDot } from "lucide-react"

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  summary: string
  isPriceImpacting: boolean
  sourceCount?: number
  aggregatedSources?: string[]
  impactPercentage?: number; // New field for impact percentage
}

interface SocialPost {
  id: string
  author: string
  authorId: string
  content: string
  postedAt: string
  source: "Twitter" | "Telegram" | "Nitter" | string
  url: string
}

interface FearGreed {
  value: string
  value_classification: string
  last_updated: string
}

interface FeedItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string; 
  isPriceImpacting: boolean;
  sourceCount?: number;
  aggregatedSources?: string[];
  author?: string;
  authorId?: string;
  itemType: 'news' | 'social';
  similarTitles?: { source: string, title: string }[];
  categories?: string[];
  impactPercentage?: number; // Replace sentiment with impact percentage
}

interface NewsFeedProps {
  filterTerm: string;
  refreshTrigger: number;
  theme?: "amber" | "green" | "blue";
}

type ConsoleLogType = 'info' | 'warn' | 'error';
interface ConsoleLog {
  type: ConsoleLogType;
  message: string;
  timestamp: string;
}

export default function NewsFeed({ filterTerm, refreshTrigger, theme = "amber" }: NewsFeedProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [timeDisplayMode, setTimeDisplayMode] = useState<'relative' | 'absolute'>('relative');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const MAX_LOGS = 10;

  const addConsoleLog = useCallback((message: string, type: ConsoleLogType = 'info') => {
    setConsoleLogs(prev => {
      const now = new Date();
      const ts = now.toLocaleTimeString('en-US', { hour12: false });
      const newLog: ConsoleLog = { type, message, timestamp: ts };
      const logs = [...prev, newLog];
      return logs.length > MAX_LOGS ? logs.slice(logs.length - MAX_LOGS) : logs;
    });
  }, []);

  useEffect(() => {
    addConsoleLog(`Refresh triggered (${typeof refreshTrigger}): ${refreshTrigger}`);
  }, [refreshTrigger, addConsoleLog]);

  useEffect(() => {
    if (typeof refreshTrigger === 'number') {
      addConsoleLog('Fetching fresh data...');
      const fetchData = async () => {
        try {
          setLoading(feedItems.length === 0);
          let combinedData: { posts: FeedItem[], error?: string, status?: string } = { posts: [] };
          let fearGreedData: FearGreed | null = null;

          const [feedResult, fgResult] = await Promise.allSettled([
            fetch("/api/social-feed"),
            fetch("/api/fear-greed")
          ]);
          if (feedResult.status === 'fulfilled') {
            if (feedResult.value.ok) {
              combinedData = await feedResult.value.json();
              if (combinedData.error) {
                setError(`API Error: ${combinedData.error}`);
                addConsoleLog(`API Error: ${combinedData.error}`, 'error');
              } else {
                setError(null);
                addConsoleLog(`Loaded ${combinedData.posts?.length || 0} feed items.`);
              }
            } else {
              const errorText = await feedResult.value.text();
              setError(`Feed error: ${feedResult.value.status}`);
              addConsoleLog(`Feed error: ${feedResult.value.status} - ${errorText}`, 'error');
            }
          } else {
            setError(`Feed fetch failed: ${feedResult.reason}`);
            addConsoleLog(`Feed fetch failed: ${feedResult.reason}`, 'error');
          }
          if (fgResult.status === 'fulfilled' && fgResult.value.ok) {
            fearGreedData = await fgResult.value.json();
            addConsoleLog('Fear & Greed index loaded.');
          } else if (fgResult.status === 'fulfilled') {
            addConsoleLog(`Failed to fetch Fear & Greed: ${fgResult.value.status}`, 'warn');
          } else {
            addConsoleLog(`Failed to fetch Fear & Greed: ${fgResult.reason}`, 'warn');
          }
          setFeedItems(combinedData.posts || []);
          setTotalCount(combinedData.posts?.length || 0);
          setFearGreed(fearGreedData);
        } catch (error) {
          addConsoleLog(`Exception: ${error instanceof Error ? error.message : String(error)}`, 'error');
          if (!error) {
            setError(`Error fetching data: ${error instanceof Error ? error.message : String(error)}`);
          }
        } finally {
          setLoading(false);
          addConsoleLog('Fetch complete.');
        }
      };
      fetchData();
    }

    const interval = setInterval(async () => {
      console.log("[NewsFeed Interval] Triggering background refresh...");
      const fetchData = async () => {
        try {
          let combinedData: { posts: FeedItem[], error?: string } = { posts: [] };
          let fearGreedData: FearGreed | null = null;
          const [feedResult, fgResult] = await Promise.allSettled([
            fetch("/api/social-feed"),
            fetch("/api/fear-greed")
          ]);
          
          if (feedResult.status === 'fulfilled' && feedResult.value.ok) {
            combinedData = await feedResult.value.json();
            if (!combinedData.error) {
              if (combinedData.posts?.length !== feedItems.length) {
                setFeedItems(combinedData.posts || []);
                setTotalCount(combinedData.posts?.length || 0);
                console.log("[NewsFeed] Silent refresh - updated with new data");
              } else {
                console.log("[NewsFeed] Silent refresh - no changes detected");
              }
            }
          }
        } catch (error) {
          console.error("Background refresh failed:", error);
        }
      };
      await fetchData();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [refreshTrigger, feedItems.length]);

  useEffect(() => {
    setFocusedIndex(-1);
    rowRefs.current = [];
  }, [feedItems, filterTerm]);

  const filteredFeed = useMemo(() => {
    console.log(`[Filtering] Starting with ${feedItems.length} items, filter: "${filterTerm}"`);
    const filtered = feedItems.filter(item => {
      const matchesText = !filterTerm || (() => {
        const term = filterTerm.toLowerCase().trim();
        if (!term) return true;
        const check = (str: string | undefined) => str?.toLowerCase().includes(term) || false;
        return check(item.title) || check(item.summary) || check(item.source) || check(item.author) || (item.aggregatedSources?.some(s => check(s)) || false);
      })();
      const matchesCategory = !selectedCategory || (item.categories && item.categories.includes(selectedCategory));
      return matchesText && matchesCategory;
    });
    console.log(`[Filtering] Result: ${filtered.length} items after filtering`);
    return filtered;
  }, [feedItems, filterTerm, selectedCategory]);

  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    feedItems.forEach(item => (item.categories || []).forEach(cat => categories.add(cat)));
    return Array.from(categories).sort();
  }, [feedItems]);

  const resetFilters = () => {
    setSelectedCategory(null);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const formatRelativeTime = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 5) return "now";
      if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      return date.toLocaleDateString("en-US", { month: '2-digit', day: '2-digit', year: '2-digit' }) + " " + date.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      console.error("Error formatting relative time for:", dateString, e);
      return dateString;
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "--/--/--";
    try { return new Date(dateString).toLocaleDateString("en-US", { month: '2-digit', day: '2-digit', year: '2-digit' }); } catch { return "--/--/--"; }
  };
  const formatTime = (dateString: string): string => {
    if (!dateString) return "--:--:--";
    try { return new Date(dateString).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch { return "--:--:--"; }
  };

  const toggleTimeDisplay = () => {
    setTimeDisplayMode(prev => prev === 'relative' ? 'absolute' : 'relative');
  };

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTableSectionElement>) => {
    if (!filteredFeed || filteredFeed.length === 0) return;
    let newIndex = focusedIndex;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      newIndex = focusedIndex === -1 ? 0 : Math.min(focusedIndex + 1, filteredFeed.length - 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      newIndex = focusedIndex <= 0 ? 0 : focusedIndex - 1;
    } else if (event.key === "Enter") {
      if (focusedIndex !== -1 && filteredFeed[focusedIndex]) {
        const item = filteredFeed[focusedIndex];
        const key = `news-item-${item.id ? String(item.id).replace(/[^\w-]/g, '-') + `-${focusedIndex}` : `idx-${focusedIndex}`}`;
        toggleExpand(key);
      }
      return;
    } else {
      return;
    }
    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      const targetRow = rowRefs.current[newIndex];
      if (targetRow) targetRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex, filteredFeed.length]);

  const toggleExpand = (id: string) => { 
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    const index = filteredFeed.findIndex(item => String(item.id || '') === id);
    setFocusedIndex(index);
  };

  const getThemeTextColor = () => {
    switch (theme) {
      case "amber": return "text-amber-400"
      case "green": return "text-lime-400"
      case "blue": return "text-cyan-400"
      default: return "text-amber-400"
    }
  }

  const getThemeAccentColor = () => {
    switch (theme) {
      case "amber": return "text-amber-300"
      case "green": return "text-lime-300"
      case "blue": return "text-cyan-300"
      default: return "text-amber-300"
    }
  }

  const getThemeHeaderColor = () => {
    switch (theme) {
      case "amber": return "text-amber-200"
      case "green": return "text-lime-200"
      case "blue": return "text-cyan-200"
      default: return "text-amber-200"
    }
  }

  const getImpactColor = (impact?: number, alpha: number = 1) => {
    if (impact === undefined) return `rgba(107, 114, 128, ${alpha})`; // gray-500
    return impact > 0 ? `rgba(34, 197, 94, ${alpha})` : `rgba(239, 68, 68, ${alpha})`; // green-500 or red-500
  };

  const handleDebugRefresh = async () => {
    console.log("Emergency data refresh triggered");
    setLoading(true);
    setError("Attempting emergency data refresh...");
    try {
      const response = await fetch("/api/social-feed");
      if (!response.ok) {
        const errorText = await response.text();
        setError(`API Error (${response.status}): ${errorText}`);
        console.error("Debug fetch error:", response.status, errorText);
      } else {
        const data = await response.json();
        if (data.error) {
          setError(`API returned error: ${data.error}`);
          console.error("API error:", data.error);
        } else if (!data.posts || data.posts.length === 0) {
          setError("API returned empty feed");
          console.error("Empty feed:", data);
        } else {
          setFeedItems(data.posts);
          setTotalCount(data.posts.length);
          setError(null);
          console.log(`Successfully loaded ${data.posts.length} items`);
        }
      }
    } catch (error) {
      console.error("Exception during debug fetch:", error);
      setError(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (error) addConsoleLog(`Error: ${error}`, 'error');
  }, [error, addConsoleLog]);

  useEffect(() => {
    if (feedItems.length > 0) {
      addConsoleLog(`Feed updated: ${feedItems.length} unique items after clustering.`);
    }
  }, [feedItems, addConsoleLog]);

  const clearConsole = () => setConsoleLogs([]);

  if (loading) {
    return (
      <div className="relative p-2 font-mono h-64">
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-amber-400" />
            <span className="text-amber-400">Loading News Feed...</span>
            <p className="text-xs text-gray-400 mt-2">This may take 10-15 seconds on first load</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && feedItems.length === 0 && !filterTerm) {
    return (
      <div className="p-8 flex flex-col items-center">
        <div className={`text-xl ${getThemeTextColor()} mb-4`}>No News Data Available</div>
        {error && (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded mb-4 max-w-2xl">
            <div className="font-bold text-red-400 mb-2">Error Details:</div>
            <div className="text-red-300 whitespace-pre-wrap break-words">{error}</div>
          </div>
        )}
        <div className="flex space-x-4 mt-4">
          <button
            onClick={handleDebugRefresh}
            className={`px-4 py-2 rounded-md ${theme === "amber" ? "bg-amber-800 hover:bg-amber-700" : theme === "green" ? "bg-green-800 hover:bg-green-700" : "bg-blue-800 hover:bg-blue-700"}`}
          >
            Emergency Refresh
          </button>
        </div>
        <div className="mt-6 text-sm text-gray-400 max-w-2xl">
          <p>If news isn't loading, there might be an issue with the API or data sources.</p>
          <p className="mt-2">Check browser console for detailed errors or try the emergency refresh button.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`font-mono bg-black ${getThemeTextColor()} text-xs`}>
      <div className={`text-xs ${getThemeAccentColor()} mb-1 border-b border-gray-800 px-2 py-1 flex justify-between items-center sticky top-0 bg-black z-20`}>
        <span>
          FEED: {filteredFeed.length} items {filterTerm || selectedCategory ? `(Filtered from ${totalCount})` : `(of ${totalCount})`}
          {filterTerm && <span className="ml-2">Search: "{filterTerm}"</span>}
          {selectedCategory && <span className="ml-2">Category: {selectedCategory}</span>}
        </span> 
        <div className="flex items-center space-x-3">
          {fearGreed && (
            <span className={`font-semibold ${fearGreed.value_classification === 'Fear' ? 'text-red-500' : 'text-green-500'}`}>
              F&G: {fearGreed.value_classification} ({fearGreed.value})
            </span>
          )}
          {error && <span className="text-yellow-500 ml-2 truncate" title={error || "Feed Error"}>WARNING</span>}
          <button 
            onClick={toggleFilters}
            className={`ml-2 px-1 py-0.5 text-xs rounded hover:bg-gray-800`}
            title="Toggle filter options"
          >
            {showFilters ? "Hide Filters" : "Filters"}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 p-2 border-b border-gray-800 bg-gray-900/40">
          <div>
            <label className={`text-xs ${getThemeHeaderColor()} mr-1`}>Category:</label>
            <select 
              value={selectedCategory || ''} 
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="bg-gray-800 border-none text-xs p-0.5 rounded"
            >
              <option value="">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          {(selectedCategory) && (
            <button 
              onClick={resetFilters}
              className="text-xs px-1 py-0.5 rounded bg-gray-800 hover:bg-gray-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      <div 
        className="overflow-y-auto outline-none"
        style={{ height: "calc(100vh - 210px)" }} 
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table className="min-w-full table-fixed border-collapse">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr>
              <th className={`p-1 border-b border-gray-700 text-left ${getThemeHeaderColor()} font-semibold w-[55%]`}>Headline</th>
              <th className={`p-1 border-b border-gray-700 text-left ${getThemeHeaderColor()} font-semibold whitespace-nowrap w-[60px]`}>Date</th>
              <th 
                className={`p-1 border-b border-gray-700 text-left ${getThemeHeaderColor()} font-semibold whitespace-nowrap w-[60px] cursor-pointer hover:bg-gray-700`}
                onClick={toggleTimeDisplay}
                title={`Click to switch to ${timeDisplayMode === 'relative' ? 'absolute' : 'relative'} time`}
              >
                Time
              </th>
              <th className={`p-1 border-b border-gray-700 text-center ${getThemeHeaderColor()} font-semibold w-[60px]`} title="Impact %">Impact</th>
              <th className={`p-1 border-b border-gray-700 text-left ${getThemeHeaderColor()} font-semibold w-[110px]`}>Source</th>
            </tr>
          </thead>
          <tbody ref={tableBodyRef} className="divide-y divide-gray-800">
            {filteredFeed.map((item, index) => {
              const key = `news-item-${item.id ? String(item.id).replace(/[^\w-]/g, '-') + `-${index}` : `idx-${index}`}`;
              const isExpanded = expandedItems[key] || false;
              const isFocused = index === focusedIndex;
              const isMultiSource = item.sourceCount && item.sourceCount > 1;
              const isTelegramPost = item.itemType === 'social' && item.source === 'Telegram';
              const newsItemDate = new Date(item.publishedAt);
              const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
              const isRecentImpact = item.isPriceImpacting && newsItemDate > thirtyMinutesAgo;
              let sourceDisplay = item.source;
              if (isTelegramPost) sourceDisplay = item.author || "Telegram";
              let rowStyle = "hover:bg-gray-800/60 cursor-pointer";
              if (isFocused) rowStyle += " bg-sky-800/50 outline outline-1 outline-sky-400";
              if (isRecentImpact) rowStyle += " text-red-400 font-semibold";

              return (
                <React.Fragment key={key}>
                  <tr 
                    ref={el => { rowRefs.current[index] = el; }}
                    className={rowStyle} 
                    onClick={() => toggleExpand(key)}
                    aria-selected={isFocused}
                    aria-expanded={isExpanded}
                  >
                    <td className="p-1 align-top">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`hover:underline ${isRecentImpact ? 'text-red-400' : getThemeAccentColor()}`} 
                        title={item.title || "View source"}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.title || "(No Title)"}
                      </a>
                    </td>
                    <td className={`p-1 whitespace-nowrap align-top ${getThemeTextColor()}`}>{formatDate(item.publishedAt)}</td>
                    <td className={`p-1 whitespace-nowrap align-top ${getThemeTextColor()}`} title={new Date(item.publishedAt).toLocaleString()}>{timeDisplayMode === 'relative' ? formatRelativeTime(item.publishedAt) : formatTime(item.publishedAt)}</td>
                    <td 
                      className="p-1 text-center"
                      style={{ color: getImpactColor(item.impactPercentage) }}
                      title={`Impact: ${item.impactPercentage !== undefined ? `${item.impactPercentage}%` : 'N/A'}`}
                    >
                      {item.impactPercentage !== undefined ? (
                        item.impactPercentage > 0 ? (
                          <TrendingUp className="w-3 h-3 inline" />
                        ) : item.impactPercentage < 0 ? (
                          <TrendingDown className="w-3 h-3 inline" />
                        ) : (
                          <CircleDot className="w-3 h-3 inline" />
                        )
                      ) : (
                        <CircleDot className="w-3 h-3 inline" />
                      )}
                      {item.impactPercentage !== undefined && `${item.impactPercentage}%`}
                    </td>
                    <td className="p-1 align-top" title={isMultiSource ? item.aggregatedSources?.join(", ") : sourceDisplay || "N/A"}>
                      <div className="flex items-center">
                        {isTelegramPost && <Send className={`w-3 h-3 mr-1 ${getThemeHeaderColor()} flex-shrink-0`}/>}
                        <span className="truncate">{sourceDisplay || "N/A"}</span>
                        {isMultiSource && <span className={`ml-1.5 text-xs py-0 px-1 ${theme === "amber" ? "bg-amber-900/70 text-amber-100" : theme === "green" ? "bg-lime-900/70 text-lime-100" : "bg-cyan-900/70 text-cyan-100"} rounded-sm whitespace-nowrap`}>{item.sourceCount} Sources</span>}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${key}-detail`} className="bg-gray-900/30">
                      <td colSpan={5} className="p-2 text-xs">
                        <div className="pl-2 border-l border-gray-700">
                          {item.categories && item.categories.length > 0 && (
                            <div className="mb-2">
                              <div className="flex flex-wrap gap-1">
                                {item.categories.map((cat, i) => (
                                  <span 
                                    key={`${key}-cat-${i}`} 
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                      theme === "amber" ? "bg-amber-900/70 text-amber-100" : 
                                      theme === "green" ? "bg-lime-900/70 text-lime-100" : 
                                      "bg-cyan-900/70 text-cyan-100"
                                    }`}
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.summary && (
                            <div className="mb-3">
                              <div className={`${getThemeAccentColor()} font-semibold mb-1`}>Summary:</div>
                              <div className={getThemeTextColor()}>{item.summary}</div>
                            </div>
                          )}
                          {isMultiSource && item.aggregatedSources && item.aggregatedSources.length > 0 && (
                            <div className="mb-3">
                              <div className={`${getThemeAccentColor()} font-semibold mb-1`}>
                                Reported by {item.aggregatedSources.length} sources:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {item.aggregatedSources.map((source, i) => (
                                  <span key={`${key}-source-${i}`} className={`inline-block px-2 py-1 rounded ${
                                    theme === "amber" ? "bg-amber-900/30 text-amber-200" : 
                                    theme === "green" ? "bg-lime-900/30 text-lime-200" : 
                                    "bg-cyan-900/30 text-cyan-200"
                                  }`}>
                                    {source}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.similarTitles && item.similarTitles.length > 0 && (
                            <div className="mb-3">
                              <div className={`${getThemeAccentColor()} font-semibold mb-1`}>Similar Headlines:</div>
                              <ul className="pl-2">
                                {item.similarTitles.map((similar, i) => (
                                  <li key={`${key}-similar-${i}`} className="mb-1 list-disc list-inside">
                                    <span className={`${getThemeHeaderColor()} mr-1`}>{similar.source}:</span>
                                    <span>{similar.title}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1 border-t border-gray-700 mt-1">
                            <div className={`text-xs ${getThemeHeaderColor()}`}>Impact:</div>
                            <span className={`text-xs ${item.impactPercentage !== undefined ? (item.impactPercentage > 0 ? 'text-green-500' : 'text-red-500') : 'text-gray-500'}`}>
                              {item.impactPercentage !== undefined ? (
                                item.impactPercentage > 0 ? (
                                  <><TrendingUp className="w-3 h-3 inline mr-1" />+{item.impactPercentage}%</>
                                ) : item.impactPercentage < 0 ? (
                                  <><TrendingDown className="w-3 h-3 inline mr-1" />{item.impactPercentage}%</>
                                ) : (
                                  <><CircleDot className="w-3 h-3 inline mr-1" />0%</>
                                )
                              ) : (
                                <><CircleDot className="w-3 h-3 inline mr-1" />N/A</>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredFeed.length === 0 && feedItems.length > 0 && (
          <div className={`p-8 text-center ${getThemeTextColor()}`}>
            <div className="mb-2 text-xl">No matching results</div>
            {filterTerm && <div className="mb-2">Search: "{filterTerm}"</div>}
            {selectedCategory && <div className="mb-2">Category: {selectedCategory}</div>}
            <button 
              onClick={resetFilters}
              className={`mt-2 px-3 py-1 rounded-md ${
                theme === "amber" ? "bg-amber-900/50 hover:bg-amber-800/50" : 
                theme === "green" ? "bg-lime-900/50 hover:bg-lime-800/50" : 
                "bg-cyan-900/50 hover:bg-cyan-800/50"
              }`}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 bg-black border-t border-gray-800 p-2 font-mono text-xs text-left max-h-32 overflow-y-auto rounded shadow-inner">
        <div className="flex justify-between items-center mb-1">
          <span className="text-amber-400 font-semibold">NEWS AGGREGATOR CONSOLE</span>
          <button onClick={clearConsole} className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Clear</button>
        </div>
        <ul className="space-y-0.5">
          {consoleLogs.length === 0 ? (
            <li className="text-gray-500">(No logs yet)</li>
          ) : (
            consoleLogs.map((log, i) => (
              <li key={i} className={
                log.type === 'error' ? 'text-red-400' :
                log.type === 'warn' ? 'text-yellow-400' :
                'text-gray-300'
              }>
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
