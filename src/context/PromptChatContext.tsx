'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import type { SavedPrompt } from '@/services/promptService';

export interface PromptChatData {
  prompt: SavedPrompt;
  responses: Record<string, string>;
}

interface PromptChatContextType {
  chatData: PromptChatData | null;
  setChatData: (data: PromptChatData) => void;
  clearChatData: () => void;
}

const PromptChatContext = createContext<PromptChatContextType | undefined>(undefined);

export function PromptChatProvider({ children }: { children: React.ReactNode }) {
  const [chatData, setChatData] = useState<PromptChatData | null>(null);

  const clearChatData = useCallback(() => {
    setChatData(null);
  }, []);

  return (
    <PromptChatContext.Provider value={{ chatData, setChatData, clearChatData }}>
      {children}
    </PromptChatContext.Provider>
  );
}

export function usePromptChat() {
  const context = useContext(PromptChatContext);
  if (!context) {
    throw new Error('usePromptChat must be used within PromptChatProvider');
  }
  return context;
}
