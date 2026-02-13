'use client';

import {
  Box,
  Card,
  TextField,
  Button,
  Stack,
  Typography,
  Alert,
  Select,
  MenuItem,
  IconButton,
  Divider,
} from '@mui/material';
import { Delete as DeleteIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { LocalAPIKeyService, type LocalStoredAPIKey } from '@/services/localAPIKeyService';
import type { AIProvider } from '@/services/ai/types';

const PROVIDERS: { label: string; value: AIProvider }[] = [
  { label: 'OpenAI (ChatGPT)', value: 'openai' },
  { label: 'Anthropic (Claude)', value: 'anthropic' },
  { label: 'Google (Gemini)', value: 'google' },
];

export default function QuickAPIKeysTab() {
  const [storedKeys, setStoredKeys] = useState<LocalStoredAPIKey[]>([]);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [showKey, setShowKey] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiKeyService = new LocalAPIKeyService();

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = () => {
    const keys = apiKeyService.getAllKeys();
    setStoredKeys(keys);
  };

  const handleSave = () => {
    try {
      if (!apiKey.trim()) {
        setError('API key is required');
        return;
      }

      apiKeyService.saveAPIKey(provider, apiKey, keyName || undefined);
      setSuccess(`${provider} API key saved successfully!`);
      setApiKey('');
      setKeyName('');
      loadKeys();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    }
  };

  const handleDelete = (provider: AIProvider) => {
    apiKeyService.deleteAPIKey(provider);
    setSuccess(`${provider} API key deleted`);
    loadKeys();
    setTimeout(() => setSuccess(null), 3000);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  const getProviderLabel = (provider: AIProvider): string => {
    return PROVIDERS.find(p => p.value === provider)?.label || provider;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Quick Setup - API Keys (LocalStorage)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Store your API keys locally in your browser. Great for quick testing! (Note: Keys are stored in localStorage - use the Supabase tab for production)
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Add New Key Form */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Add API Key
        </Typography>
        <Stack spacing={2}>
          <Select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            fullWidth
          >
            {PROVIDERS.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </Select>

          <TextField
            label="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            type="password"
            placeholder="sk-..."
          />

          <TextField
            label="Key Name (Optional)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            fullWidth
            placeholder="My API Key"
          />

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!apiKey.trim()}
          >
            Save API Key
          </Button>
        </Stack>
      </Card>

      {/* Stored Keys */}
      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Stored API Keys
        </Typography>
        
        {storedKeys.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No API keys stored yet. Add one above to get started!
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {storedKeys.map((key) => (
              <Box
                key={key.provider}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box flex={1}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {getProviderLabel(key.provider)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {showKey === key.provider ? key.apiKey : maskKey(key.apiKey)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Added: {new Date(key.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setShowKey(showKey === key.provider ? null : key.provider)}
                >
                  {showKey === key.provider ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(key.provider)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
      </Card>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Quick Start:</strong> Add your OpenAI API key above, then go to the Chat page to start chatting!
        </Typography>
      </Alert>
    </Box>
  );
}
