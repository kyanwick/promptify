"use client";

import { useState } from "react";
import ChatMessage from "./ChatMessage";

type MessageContent = {
  type: "text" | "image" | "video" | "code";
  content: string;
  language?: string;
  url?: string;
};

type Message = {
  role: "user" | "assistant";
  contents: MessageContent[];
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { 
      role: "user", 
      contents: [{ type: "text", content: input }]
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // TODO: Call AI API and save to database
    // For now, mock response with different content types
    setTimeout(() => {
      const aiMessage: Message = {
        role: "assistant",
        contents: [
          { type: "text", content: "Here's a mock response with different content types:" },
          { type: "text", content: "\n**Text:** This is regular text content." },
          { type: "text", content: "\n**Code Example:**" },
          { 
            type: "code", 
            content: `function hello() {\n  console.log("Hello, world!");\n}\n\nhello();`,
            language: "javascript"
          },
          { type: "text", content: "\n**Sample Image:**" },
          {
            type: "image",
            url: "https://picsum.photos/400/300",
            content: "Sample image from Lorem Picsum"
          },
          { type: "text", content: "\n**Sample Video:**" },
          {
            type: "video",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            content: "Sample YouTube video"
          },
          { type: "text", content: "\nAI integration coming next!" }
        ],
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex h-[calc(100vh-300px)] gap-4">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p className="text-lg mb-2">How can I help you today?</p>
              <p className="text-sm">Start a conversation by typing a message below.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage key={idx} role={msg.role} contents={msg.contents} />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
                <span className="text-gray-500">Typing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="px-6 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Conversation History */}
      <div className="w-80 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
            Conversations
          </h3>
          <button className="text-xs px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded transition-colors">
            + New
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Your conversation history will appear here
        </p>
      </div>
    </div>
  );
}

