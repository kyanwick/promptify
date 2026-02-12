"use client";

import { useState, useRef } from "react";
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

type AIProvider = "openai" | "claude";
type AIModel = {
  provider: AIProvider;
  name: string;
  label: string;
};

const AI_MODELS: AIModel[] = [
  { provider: "openai", name: "gpt-4", label: "GPT-4" },
  { provider: "openai", name: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { provider: "openai", name: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { provider: "claude", name: "claude-3-opus", label: "Claude 3 Opus" },
  { provider: "claude", name: "claude-3-sonnet", label: "Claude 3 Sonnet" },
  { provider: "claude", name: "claude-3-haiku", label: "Claude 3 Haiku" },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim() && !uploadedFile) return;

    // Build user message contents
    const userContents: MessageContent[] = [];
    
    if (input.trim()) {
      userContents.push({ type: "text", content: input });
    }
    
    if (uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      const isVideo = uploadedFile.type.startsWith('video/');
      userContents.push({
        type: isVideo ? "video" : "image",
        content: uploadedFile.name,
        url: fileUrl,
      });
    }

    const userMessage: Message = { 
      role: "user", 
      contents: userContents
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUploadedFile(null);
    setIsLoading(true);

    // TODO: Call AI API and save to database
    // For now, mock streaming response
    setIsStreaming(true);
    const fullText = "Here's a mock response with a smooth streaming effect! This simulates how AI chat generates text character by character, creating a more engaging and natural conversation experience. The text appears gradually, just like ChatGPT and other modern AI assistants.";
    
    let currentIndex = 0;
    const streamText = () => {
      if (currentIndex < fullText.length) {
        setStreamingText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
        
        // Calculate delay: starts at 15ms, gradually decreases to 3ms
        const progress = currentIndex / fullText.length;
        const delay = Math.max(3, 15 - (progress * 12));
        
        setTimeout(streamText, delay);
      } else {
        // Once streaming is complete, add to messages
        const aiMessage: Message = {
          role: "assistant",
          contents: [
            { type: "text", content: fullText },
          ],
        };
        setMessages((prev) => [...prev, aiMessage]);
        setStreamingText("");
        setIsStreaming(false);
        setIsLoading(false);
      }
    };
    
    streamText();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setUploadedFile(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 relative">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Chat Header with Model Selector */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              aria-label="Open conversation history"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              AI Chat
            </h2>
          </div>
          <select
            value={`${selectedModel.provider}:${selectedModel.name}`}
            onChange={(e) => {
              const [provider, name] = e.target.value.split(':');
              const model = AI_MODELS.find(m => m.provider === provider && m.name === name);
              if (model) setSelectedModel(model);
            }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium [&>optgroup]:font-medium [&>option]:font-normal"
          >
            <optgroup label="OpenAI" className="font-medium">
              {AI_MODELS.filter(m => m.provider === 'openai').map(model => (
                <option key={model.name} value={`${model.provider}:${model.name}`} className="font-normal">
                  {model.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Anthropic" className="font-medium">
              {AI_MODELS.filter(m => m.provider === 'claude').map(model => (
                <option key={model.name} value={`${model.provider}:${model.name}`} className="font-normal">
                  {model.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

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
          {isStreaming && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="max-w-full bg-transparent p-3">
                <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                  {streamingText}
                  <span className="inline-block w-2 h-5 bg-gray-800 dark:bg-gray-200 ml-1 animate-pulse"></span>
                </div>
              </div>
            </div>
          )}
          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
                <span className="text-gray-500">Typing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {/* File Preview */}
          {uploadedFile && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                📎 {uploadedFile.name}
              </span>
              <button
                onClick={removeFile}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              title="Attach file"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !uploadedFile)}
              className="px-6 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Right Sidebar - Conversation History */}
      <div className={`
        fixed lg:relative top-auto right-0 h-[calc(100vh-120px)] lg:h-auto z-50 lg:z-auto
        w-80 bg-white dark:bg-gray-800 rounded-none lg:rounded-lg 
        border-l lg:border border-gray-200 dark:border-gray-700 p-4
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
            Conversations
          </h3>
          <div className="flex items-center gap-2">
            <button className="text-xs px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded transition-colors">
              + New
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Your conversation history will appear here
        </p>
      </div>
    </div>
  );
}

