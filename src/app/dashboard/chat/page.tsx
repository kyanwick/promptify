'use client';
import {
  Box,
  Card,
  TextField,
  IconButton,
  Typography,
  Stack,
  Collapse,
  Alert,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material';
import { Send as SendIcon, ExpandMore as ExpandMoreIcon, Stop as StopIcon } from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';
import { usePromptChat } from '@/context/PromptChatContext';
import { SavedPrompt } from '@/services/promptService';
import { UserAPIKeyService } from '@/services/userAPIKeyService';
import type { AIProvider } from '@/services/ai/types';
import { useUserId } from '@/hooks/useUserId';
import { modelService } from '@/services/modelService';
import { useRouter } from 'next/navigation';
import MessageRenderer from '@/components/chat/MessageRenderer';
import ThinkingIndicator from '@/components/chat/ThinkingIndicator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RateLimitInfo {
  isLimited: boolean;
  nextAvailableIn?: number;
  remaining?: {
    requestsThisDay?: number;
    requestsThisHour?: number;
  };
}

export default function ChatPage() {
  const router = useRouter();
  const { userId, loading: userIdLoading } = useUserId();
  const { chatData, clearChatData } = usePromptChat();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [expandedPrompt, setExpandedPrompt] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<SavedPrompt | null>(null);
  const [currentResponses, setCurrentResponses] = useState<Record<string, string>>({});
  const [payloadMessage, setPayloadMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [availableProviders, setAvailableProviders] = useState<Array<{ provider: AIProvider; models: string[] }>>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const assistantMessageRef = useRef<string>('');

  // Initialize userId on mount and load available providers
  useEffect(() => {
    if (!userIdLoading && userId) {
      loadAvailableProviders(userId);
    }
  }, [userId, userIdLoading]);

  const loadAvailableProviders = async (userId: string) => {
    setLoadingProviders(true);
    try {
      console.log('[Chat] Loading providers for userId:', userId);
      const apiKeyService = new UserAPIKeyService();
      const providers = await apiKeyService.getAvailableProviders(userId);
      console.log('[Chat] Available providers from DB:', providers);

      // Fetch latest models for each provider (with API key for dynamic fetching)
      const providerModels = await Promise.all(
        providers.map(async (provider) => {
          const models = await modelService.getLatestModels(provider, userId);
          console.log(`[Chat] Models for ${provider}:`, models);
          return { provider, models };
        })
      );

      console.log('[Chat] Provider models loaded:', providerModels);
      setAvailableProviders(providerModels);

      // Try to load last used config from localStorage
      const lastUsedConfig = localStorage.getItem('lastUsedProviderModel');
      let configSet = false;

      if (lastUsedConfig && providerModels.length > 0) {
        // Check if last used config is still available
        const [lastProvider, lastModel] = lastUsedConfig.split(':');
        const providerExists = providerModels.find(
          (p) => p.provider === lastProvider && p.models.includes(lastModel)
        );

        if (providerExists) {
          setSelectedConfig(lastUsedConfig);
          configSet = true;
          console.log('[Chat] Restored last used config:', lastUsedConfig);
        }
      }

      // If no last used config or it's not available, set first available
      if (!configSet && providerModels.length > 0) {
        const firstProvider = providerModels[0];
        if (firstProvider.models.length > 0) {
          const firstConfig = `${firstProvider.provider}:${firstProvider.models[0]}`;
          setSelectedConfig(firstConfig);
          console.log('[Chat] Set first available config:', firstConfig);
        }
      }
    } catch (err) {
      console.error('[Chat] Failed to load available providers', err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const getProviderLabel = (provider: AIProvider): string => {
    const labels: Record<AIProvider, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google',
      local: 'Local',
    };
    return labels[provider] || provider;
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load prompt data from context on mount
  useEffect(() => {
    if (chatData) {
      // Include system message and user prompts
      const systemNode = chatData.prompt.nodes.find((node) => node.type === 'system');
      const userPrompts = chatData.prompt.nodes.filter((node) => node.type === 'user');
      
      let responseText = '';
      if (systemNode) {
        responseText += `System: ${systemNode.content}\n\nContext:\n\n`;
      }
      responseText += userPrompts
        .map((node) => `User Prompt:\n${node.content}\nUser Response:\n${chatData.responses[node.id] || ''}`)
        .join('\n\n');

      // Store prompt data in state for rendering
      setCurrentPrompt(chatData.prompt);
      setCurrentResponses(chatData.responses);
      setPayloadMessage(responseText);

      setMessages([
        {
          role: 'user',
          content: `Following prompt: "${chatData.prompt.title}"\n\n${responseText}`,
        },
        {
          role: 'assistant',
          content: 'This is a placeholder response. Connect your AI service here!',
        },
      ]);
      clearChatData();
    }
  }, [chatData, clearChatData]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save selected provider/model to localStorage whenever it changes
  useEffect(() => {
    if (selectedConfig) {
      localStorage.setItem('lastUsedProviderModel', selectedConfig);
    }
  }, [selectedConfig]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !userId) return;

    // Check if user has configured an API key
    if (availableProviders.length === 0) {
      setError('No API keys configured. Please add your API keys in Settings (click your avatar → Settings → API Keys tab).');
      return;
    }

    setError(null);
    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsGenerating(true);
    assistantMessageRef.current = '';

    try {
      // Parse config: "provider:model"
      const [provider, model] = selectedConfig.split(':');

      console.log('[Chat] Sending message:', { provider, model, userId, messageCount: messages.length + 1 });

      // Create abort controller for streaming
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.filter((m) => m.role !== 'assistant' || m.content !== 'This is a placeholder response. Connect your AI service here!'),
            { role: 'user', content: userMessage },
          ],
          options: {
            model,
            temperature: 0.7,
            maxTokens: 2000,
          },
          stream: true,
          userId,
          provider,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          setRateLimitInfo({
            isLimited: true,
            nextAvailableIn: errorData.retryAfter ? errorData.retryAfter * 1000 : undefined,
          });
          setError(`Rate limited. Try again in ${errorData.retryAfter || 'a few'} seconds.`);
        } else if (response.status === 403 && errorData.code === 'NO_API_KEY') {
          setError(`No ${provider} API key configured. Please add it in Settings.`);
        } else {
          setError(errorData.error || 'Failed to get response');
        }
        
        setIsGenerating(false);
        return;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      console.log('[Chat] Starting to read stream');

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'error') {
                setError(parsed.error);
                setIsGenerating(false);
                return;
              }

              if (parsed.type === 'text' && parsed.content) {
                assistantContent += parsed.content;
                assistantMessageRef.current = assistantContent;
                setMessages((prev) => {
                  const updated = [...prev];
                  if (updated[updated.length - 1].role === 'assistant') {
                    updated[updated.length - 1].content = assistantContent;
                  }
                  return updated;
                });
              }
            } catch (parseError) {
              console.log('[Chat] Failed to parse line:', line, parseError);
              // Skip unparseable lines
            }
          }
        }
      }

      setIsGenerating(false);
    } catch (err: any) {
      console.error('[Chat] Error in handleSend:', err);
      if (err.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      }
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" fontWeight={600} mb={2}>
        AI Chat
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {rateLimitInfo?.isLimited && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Rate limited. Try again in {Math.ceil((rateLimitInfo.nextAvailableIn || 0) / 1000)} seconds.
        </Alert>
      )}

      {loadingProviders && (
        <Alert severity="info" icon={<CircularProgress size={20} color="info" />} sx={{ mb: 2 }}>
          Loading available AI providers...
        </Alert>
      )}

      {!loadingProviders && availableProviders.length === 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => router.push('/dashboard/settings')}
            >
              Go to Settings
            </Button>
          }
        >
          No API keys configured. Please add your API keys in Settings (Avatar → Settings → API Keys tab).
        </Alert>
      )}

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 4 } }}>
          <Stack spacing={{ xs: 2, sm: 4 }}>
            {messages.map((message, index) => {
              const isPromptMessage = index === 0 && message.role === 'user' && message.content.startsWith('Following prompt:');
              
              if (isPromptMessage && currentPrompt) {
                return (
                  <Box key={index}>
                    <Card
                      sx={{
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <Typography variant="h5">{currentPrompt.emoji}</Typography>
                          <Box flex={1}>
                            <Typography 
                              variant="subtitle1" 
                              fontWeight={600}
                              sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}
                            >
                              {currentPrompt.title}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedPrompt(!expandedPrompt)}
                            sx={{
                              transform: expandedPrompt ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s',
                            }}
                          >
                            <ExpandMoreIcon />
                          </IconButton>
                        </Stack>

                        {/* User Responses */}
                        <Collapse in={expandedPrompt}>
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            {/* Raw Message */}
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                Raw Message Sent to AI
                              </Typography>
                              <Box
                                sx={{
                                  p: 1.5,
                                  bgcolor: 'action.hover',
                                  borderRadius: 1,
                                  fontFamily: 'monospace',
                                  fontSize: '0.85rem',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  maxHeight: '300px',
                                  overflow: 'auto',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                {payloadMessage}
                              </Box>
                            </Box>

                            {/* Individual Fields */}
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                              Responses
                            </Typography>
                            {currentPrompt.nodes
                              .filter((node) => node.type === 'user')
                              .map((node) => (
                                <Box key={node.id} sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    {node.content}
                                  </Typography>
                                  <Typography variant="body2" sx={{ mt: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    {currentResponses[node.id] || '(No response)'}
                                  </Typography>
                                </Box>
                              ))}
                          </Box>
                        </Collapse>
                      </Box>
                    </Card>
                  </Box>
                );
              }

              return (
                <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {message.role === 'user' ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: { xs: '85%', sm: '70%' },
                          p: { xs: 1.5, sm: 2 },
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: 1,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.6,
                        }}
                      >
                        <Typography variant="body1" color="inherit">{message.content}</Typography>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      {message.content ? (
                        <>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              color: 'success.main',
                            }}
                          >
                            AI Assistant
                          </Typography>
                          <MessageRenderer content={message.content} isUser={false} />
                        </>
                      ) : (
                        <ThinkingIndicator />
                      )}
                    </>
                  )}
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderTop: 1, borderColor: 'divider' }}>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1}
          >
            <Select
              value={selectedConfig}
              onChange={(e) => setSelectedConfig(e.target.value)}
              sx={{ 
                minWidth: { xs: '100%', sm: 220 },
                width: { xs: '100%', sm: 'auto' }
              }}
              disabled={availableProviders.length === 0}
              size="small"
            >
              {availableProviders.length === 0 ? (
                <MenuItem disabled>No providers configured</MenuItem>
              ) : (
                availableProviders.map((item) =>
                  item.models.map((model) => (
                    <MenuItem
                      key={`${item.provider}:${model}`}
                      value={`${item.provider}:${model}`}
                    >
                      {getProviderLabel(item.provider)} - {model}
                    </MenuItem>
                  ))
                )
              )}
            </Select>
            <TextField
              fullWidth
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              multiline
              maxRows={4}
              disabled={isGenerating}
              size="small"
            />
            {isGenerating ? (
              <IconButton color="error" onClick={handleStop} title="Stop generating">
                <StopIcon />
              </IconButton>
            ) : (
              <IconButton color="primary" onClick={handleSend} disabled={!input.trim()}>
                <SendIcon />
              </IconButton>
            )}
          </Stack>
        </Box>
      </Card>
    </Box>
  );
}
