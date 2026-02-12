'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, Typography, Paper, Stack, Chip } from '@mui/material';
import { Public as PublicIcon } from '@mui/icons-material';
import PromptPreview from '@/components/prompts/PromptPreview';
import { promptService, type SavedPrompt } from '@/services/promptService';

export default function SharePromptPage() {
  const params = useParams();
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
        
        if (!data) {
          setError('Prompt not found');
        } else if (!data.is_public) {
          setError('This prompt is private');
        } else {
          setPrompt(data);
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
          minHeight: '100vh',
          bgcolor: 'background.default',
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
          minHeight: '100vh',
          bgcolor: 'background.default',
          gap: 2,
          px: 2,
        }}
      >
        <Typography variant="h4">🔒</Typography>
        <Typography variant="h6" color="error">
          {error || 'Prompt not found'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The prompt you're looking for may be private or doesn't exist.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {/* Header */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Typography variant="h3" sx={{ fontSize: '2.5rem' }}>
              {prompt.emoji || '📝'}
            </Typography>
            <Box flex={1}>
              <Typography variant="h5" fontWeight={600}>
                {prompt.title}
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip
                  icon={<PublicIcon />}
                  label="Public Prompt"
                  size="small"
                  color="info"
                />
                <Chip
                  label={prompt.status}
                  size="small"
                  color={prompt.status === 'published' ? 'success' : 'default'}
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* Prompt Preview */}
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
          }}
        >
          <PromptPreview nodes={prompt.nodes} />
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
          <Typography variant="caption" color="text.secondary">
            Shared via Promptify
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
