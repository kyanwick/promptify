import { Metadata } from "next";
import ChatInterface from "@/components/prompts/ChatInterface";

export const metadata: Metadata = {
  title: "AI Chat | Promptify",
  description: "Chat with AI",
};

export default function ChatPage() {
  return <ChatInterface />;
}
