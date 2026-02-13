'use client';

import {
  Box,
  Card,
  TextField,
  Button,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { UserAPIKeyService, type StoredAPIKey } from '@/services/userAPIKeyService';
import type { AIProvider } from '@/services/ai/types';
import { useUserId } from '@/hooks/useUserId';

interface APIKeyFormData {
  provider: AIProvider;
  apiKey: string;
  keyName: string;
}

const PROVIDERS: { label: string; value: AIProvider }[] = [
  { label: 'OpenAI (ChatGPT)', value: 'openai' },
  { label: 'Anthropic (Claude)', value: 'anthropic' },
  { label: 'Google (Gemini)', value: 'google' },
];

export default function APIKeysTab() {
  const { userId, loading: userIdLoading } = useUserId();
  const [storedKeys, setStoredKeys] = useState<StoredAPIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<APIKeyFormData>({
    provider: 'openai',
    apiKey: '',
    keyName: '',
  });

  const apiKeyService = new UserAPIKeyService();

  useEffect(() => {
    if (!userIdLoading && userId) {
      loadAPIKeys();
    }
  }, [userId, userIdLoading]);

  const loadAPIKeys = async () => {
    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const keys = await apiKeyService.listAPIKeys(userId);
      setStoredKeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({ provider: 'openai', apiKey: '', keyName: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ provider: 'openai', apiKey: '', keyName: '' });
  };

  const handleSaveAPIKey = async () => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    try {
      if (!formData.apiKey.trim()) {
        setError('API key is required');
        return;
      }

      setLoading(true);

      await apiKeyService.saveAPIKey(
        userId,
        formData.provider,
        formData.apiKey,
        formData.keyName || undefined
      );

      setSuccess(`${formData.provider} API key saved successfully!`);
      handleCloseDialog();
      await loadAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAPIKey = async (provider: AIProvider) => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);

      await apiKeyService.deleteAPIKey(userId, provider);

      setSuccess(`${provider} API key deleted`);
      await loadAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    } finally {
      setLoading(false);
    }
  };

  const maskAPIKey = (key: string) => {
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.slice(0, 4) + '*'.repeat(Math.max(8, key.length - 8)) + key.slice(-4);
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          API Keys
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your AI provider API keys to use them in the chat. Your keys are encrypted and only visible to you.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleOpenDialog}
        disabled={loading}
      >
        Add API Key
      </Button>

      {loading && storedKeys.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : storedKeys.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No API keys configured yet. Add one to get started!
          </Typography>
        </Card>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Provider</TableCell>
                <TableCell>Key Name</TableCell>
                <TableCell>API Key</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Used</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {storedKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <Typography fontWeight={600}>{key.provider}</Typography>
                  </TableCell>
                  <TableCell>{key.keyName}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {showApiKey === key.id ? maskAPIKey('...') : maskAPIKey('...')}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setShowApiKey(showApiKey === key.id ? null : key.id)
                        }
                      >
                        {showApiKey === key.id ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        color: key.isActive ? 'success.main' : 'error.main',
                        fontWeight: 600,
                      }}
                    >
                      {key.isActive ? '✓ Active' : '✗ Inactive'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteAPIKey(key.provider)}
                      disabled={loading}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add API Key</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Provider
              </Typography>
              <Select
                value={formData.provider}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value as AIProvider })
                }
                fullWidth
              >
                {PROVIDERS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <TextField
              label="Key Name (Optional)"
              placeholder="e.g., Personal Account"
              value={formData.keyName}
              onChange={(e) =>
                setFormData({ ...formData, keyName: e.target.value })
              }
              fullWidth
              size="small"
            />

            <Box>
              <TextField
                label="API Key"
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                fullWidth
                multiline
                rows={3}
                placeholder="Paste your API key here"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {formData.provider === 'openai' && 'Get your key from https://platform.openai.com/api-keys'}
                {formData.provider === 'anthropic' && 'Get your key from https://console.anthropic.com/'}
                {formData.provider === 'google' && 'Get your key from https://makersuite.google.com/app/apikey'}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveAPIKey}
            variant="contained"
            disabled={loading || !formData.apiKey.trim()}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
