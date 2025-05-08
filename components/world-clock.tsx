"use client";

import { useEffect, useState } from "react";

interface WorldClockProps {
  theme?: "amber" | "green" | "blue";
}

export default function WorldClock({ theme = "amber" }: WorldClockProps) {
  const [times, setTimes] = useState({
    nyc: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }),
    london: new Date().toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }),
    hongkong: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', hour12: false }),
    tokyo: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false }),
  });

  useEffect(() => {
    const updateTimes = () => {
      setTimes({
        nyc: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }),
        london: new Date().toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }),
        hongkong: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', hour12: false }),
        tokyo: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false }),
      });
    };

    updateTimes();
    const interval = setInterval(updateTimes, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Generate theme-specific text colors
  const getTextColor = () => {
    switch (theme) {
      case "amber": return "text-amber-400";
      case "green": return "text-lime-400";
      case "blue": return "text-cyan-400";
      default: return "text-amber-400";
    }
  };

  const getLabelColor = () => {
    switch (theme) {
      case "amber": return "text-amber-300";
      case "green": return "text-lime-300";
      case "blue": return "text-cyan-300";
      default: return "text-amber-300";
    }
  };

  return (
    <div className="flex items-center space-x-2 text-[10px]">
      <div className="flex flex-col items-center">
        <span className={`${getLabelColor()}`}>NYC</span>
        <span className={`${getTextColor()}`}>{times.nyc}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className={`${getLabelColor()}`}>LON</span>
        <span className={`${getTextColor()}`}>{times.london}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className={`${getLabelColor()}`}>HK</span>
        <span className={`${getTextColor()}`}>{times.hongkong}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className={`${getLabelColor()}`}>TYO</span>
        <span className={`${getTextColor()}`}>{times.tokyo}</span>
      </div>
    </div>
  );
} 