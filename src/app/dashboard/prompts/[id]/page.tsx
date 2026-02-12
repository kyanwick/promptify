'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import PromptBuilder from '@/components/prompts';
import { promptService, type SavedPrompt } from '@/services/promptService';

export default function EditPromptPage() {
  const params = useParams();
  const router = useRouter();
  const [prompt, setPrompt] = useState<SavedPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrompt = async () => {
      if (!params.id || typeof params.id !== 'string') {
        setError('Invalid prompt ID');
        setLoading(false);
        return;
      }

      try {
        const data = await promptService.getPrompt(params.id);
        if (data) {
          setPrompt(data);
        } else {
          setError('Prompt not found');
        }
      } catch (err) {
        console.error('Error loading prompt:', err);
        setError('Failed to load prompt');
      } finally {
        setLoading(false);
      }
    };

    loadPrompt();
  }, [params.id]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !prompt) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          gap: 2,
        }}
      >
        <Typography variant="h6" color="error">
          {error || 'Prompt not found'}
        </Typography>
        <Typography
          variant="body2"
          sx={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => router.push('/dashboard/library')}
        >
          Go back to library
        </Typography>
      </Box>
    );
  }

  return <PromptBuilder initialPrompt={prompt} />;
}
