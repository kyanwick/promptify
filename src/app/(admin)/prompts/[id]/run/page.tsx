import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ChatInterface from "@/components/prompts/ChatInterface";

export const metadata: Metadata = {
  title: "Run Prompt | Promptify",
  description: "Run your AI prompt and get responses",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RunPromptPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Fetch the prompt from database
  const { data: prompt, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id)
    .single();

  // If prompt doesn't exist or user doesn't own it, show 404
  if (error || !prompt) {
    notFound();
  }
  return (
    <div className="space-y-4">
      {/* Prompt Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          {prompt.title}
        </h1>
        {prompt.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {prompt.description}
          </p>
        )}
        {prompt.category && (
          <span className="inline-block mt-2 text-xs px-2 py-1 bg-brand-100 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded">
            {prompt.category}
          </span>
        )}
      </div>

      {/* Chat Interface - This will be a client component */}
      <ChatInterface prompt={prompt} />
    </div>
  );
}