"use client";

import Image from "next/image";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type MessageContent = {
  type: "text" | "image" | "video" | "code";
  content: string;
  language?: string; // For code blocks
  url?: string; // For images/videos
};

type ChatMessageProps = {
  role: "user" | "assistant";
  contents: MessageContent[];
};

export default function ChatMessage({ role, contents }: ChatMessageProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isUser = role === "user";
  
  // Check if total text content is under 75 chars (only for user messages)
  const totalTextLength = contents
    .filter(item => item.type === "text")
    .reduce((acc, item) => acc + item.content.length, 0);
  
  const shouldWrap = isUser && totalTextLength > 75;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start w-full"}`}>
      <div
        className={`rounded-lg space-y-3 ${
          isUser
            ? `bg-brand-500 text-white p-4 ${shouldWrap ? 'max-w-md' : ''}`
            : "text-gray-800 dark:text-white w-full"
        }`}
      >
        {contents.map((item, idx) => {
          switch (item.type) {
            case "text":
              return (
                <div key={idx} className="whitespace-pre-wrap">
                  {item.content}
                </div>
              );

            case "image":
              return (
                <div key={idx} className="relative overflow-hidden rounded-lg max-w-2xl">
                  <Image
                    src={item.url || ""}
                    alt="Shared image"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              );

            case "video":
              return (
                <div key={idx} className="relative overflow-hidden rounded-lg aspect-video max-w-3xl">
                  {item.url?.includes("youtube.com") || item.url?.includes("youtu.be") ? (
                    <iframe
                      src={item.url}
                      title="Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <video controls className="w-full h-full">
                      <source src={item.url} />
                    </video>
                  )}
                </div>
              );

            case "code":
              return (
                <div key={idx} className="relative max-w-3xl">
                  <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
                    <span className="text-xs text-gray-400">
                      {item.language || "code"}
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.content, idx)}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                      {copiedIndex === idx ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    language={item.language || "javascript"}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      borderRadius: "0 0 8px 8px",
                      fontSize: "0.875rem",
                    }}
                  >
                    {item.content}
                  </SyntaxHighlighter>
                </div>
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
