'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PromptChatProvider } from '@/context/PromptChatContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PromptChatProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </PromptChatProvider>
  );
}
