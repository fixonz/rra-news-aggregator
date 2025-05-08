"use client";

import { useState, ChangeEvent } from 'react';
import { Terminal } from 'lucide-react';

interface CommandInputProps {
  onFilterChange: (filterTerm: string) => void;
}

export default function CommandInput({ onFilterChange }: CommandInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setInputValue(term);
    onFilterChange(term);
  };

  return (
    <div className="flex items-center p-1 bg-gray-900 border-b border-gray-700 font-mono text-xs">
      <Terminal className="w-4 h-4 mr-2 text-cyan-400 flex-shrink-0" />
      <span className="text-cyan-400 mr-1">{`>`}</span>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Filter feed... (e.g., BTC, alert, coindesk)"
        className="flex-grow bg-transparent text-lime-300 placeholder-gray-500 focus:outline-none"
      />
      {/* Optional: Blinking cursor effect (requires CSS or more complex state) */}
      {/* <span className="w-2 h-4 bg-amber-300 animate-blink"></span> */} 
    </div>
  );
}

// Add basic blink animation if needed (in globals.css or via styled components)
/* 
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.animate-blink {
  animation: blink 1s step-end infinite;
}
*/ 