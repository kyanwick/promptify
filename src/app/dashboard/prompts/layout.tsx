import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prompt Builder | Promptify',
  description: 'Build and design your AI prompts',
};

export default function PromptBuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
