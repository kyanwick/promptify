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
import {
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  Stop as StopIcon,
  Menu as MenuIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
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
import ChatHistoryList from '@/components/chat/ChatHistoryList';
import {
  chatHistoryService,
  MAX_MESSAGES_PER_SESSION,
  type ChatSession,
} from '@/services/chatHistoryService';
import { chatCleanupService } from '@/services/chatCleanupService';

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

  // Chat history persistence state
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const assistantMessageRef = useRef<string>('');

  // Initialize userId on mount and load available providers
  useEffect(() => {
    if (!userIdLoading && userId) {
      loadAvailableProviders(userId);
    }
  }, [userId, userIdLoading]);

  // Create initial session when providers are loaded and config is selected
  useEffect(() => {
    // Don't create a session if we have a prompt message already loaded
    const hasPromptMessage = messages.length > 0 && messages[0].content.startsWith('Following prompt:');
    if (!loadingProviders && selectedConfig && userId && !currentSession && !chatData && !hasPromptMessage) {
      createNewSession();
    }
  }, [loadingProviders, selectedConfig, userId, currentSession, chatData, messages]);

  // Run automatic cleanup on mount (once per day)
  useEffect(() => {
    if (userId) {
      chatCleanupService.autoCleanup();
    }
  }, [userId]);

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

  // Create a new chat session
  const createNewSession = async (preserveMessages = false) => {
    if (!selectedConfig || !userId) return null;

    const [provider, model] = selectedConfig.split(':');

    const session = await chatHistoryService.createSession({
      title: 'New Chat',
      provider: provider as AIProvider,
      model,
    });

    if (session) {
      setCurrentSession(session);
      // Only reset messages if not preserving them (e.g., when coming from a prompt)
      if (!preserveMessages) {
        setMessages([
          {
            role: 'assistant',
            content: 'Hello! How can I help you today?',
          },
        ]);
      }
      setSidebarRefreshTrigger(prev => prev + 1); // Refresh sidebar
      console.log('[Chat] Created new session:', session.id);
    }

    return session;
  };

  // Load an existing session with its messages
  const loadSession = async (sessionId: string) => {
    setLoadingSession(true);
    try {
      const data = await chatHistoryService.getSessionWithMessages(sessionId);
      if (data) {
        setCurrentSession(data.session);
        setMessages(data.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })));

        // Update selected config to match session
        setSelectedConfig(`${data.session.provider}:${data.session.model}`);

        console.log('[Chat] Loaded session:', sessionId, 'with', data.messages.length, 'messages');
      }
    } catch (err) {
      console.error('[Chat] Failed to load session:', err);
      setError('Failed to load chat session');
    } finally {
      setLoadingSession(false);
    }
  };

  // Save a message to the database
  const saveMessageToDB = async (role: 'user' | 'assistant', content: string) => {
    if (!currentSession) return;

    const saved = await chatHistoryService.addMessage({
      session_id: currentSession.id,
      role,
      content,
    });

    if (saved) {
      // Update session message count in local state
      setCurrentSession(prev => prev ? { ...prev, message_count: prev.message_count + 1 } : null);
    }

    return saved;
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load prompt data from context on mount
  useEffect(() => {
    if (chatData && userId) {
      // If provider/model is specified in chatData, use it
      if (chatData.provider && chatData.model) {
        const configFromPrompt = `${chatData.provider}:${chatData.model}`;
        setSelectedConfig(configFromPrompt);
      }

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
      console.log('[Chat] Setting prompt data:', {
        promptTitle: chatData.prompt.title,
        hasProvider: !!chatData.provider,
        hasModel: !!chatData.model,
      });
      setCurrentPrompt(chatData.prompt);
      setCurrentResponses(chatData.responses);
      setPayloadMessage(responseText);

      const promptMessage = `Following prompt: "${chatData.prompt.title}"\n\n${responseText}`;
      console.log('[Chat] Prompt message starts with:', promptMessage.substring(0, 30));

      setMessages([
        {
          role: 'user',
          content: promptMessage,
        },
      ]);

      // Wait for providers to load before sending
      if (!loadingProviders && (chatData.provider || selectedConfig)) {
        // Automatically send the prompt to the AI
        sendMessageToAI(promptMessage);
      }

      // Clear chatData after a brief delay to ensure component has rendered
      setTimeout(() => {
        clearChatData();
      }, 100);
    }
  }, [chatData, userId, loadingProviders]);

  // Send prompt message after providers load (if we have a pending prompt message)
  useEffect(() => {
    if (!loadingProviders && selectedConfig && messages.length === 1 && messages[0].role === 'user' && messages[0].content.startsWith('Following prompt:') && currentPrompt) {
      // Check if we haven't already sent this message (no assistant response yet)
      const hasAssistantResponse = messages.some(m => m.role === 'assistant');
      if (!hasAssistantResponse && !isGenerating) {
        sendMessageToAI(messages[0].content);
      }
    }
  }, [loadingProviders, selectedConfig]);

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

  const sendMessageToAI = async (userMessage: string) => {
    if (isGenerating || !userId) return;

    // Check if user has configured an API key
    if (availableProviders.length === 0) {
      setError('No API keys configured. Please add your API keys in Settings (click your avatar → Settings → API Keys tab).');
      return;
    }

    setError(null);
    setIsGenerating(true);
    assistantMessageRef.current = '';

    // Check if we need to create a session
    let sessionToUse = currentSession;
    if (!sessionToUse) {
      // Preserve messages when creating a session (don't reset to greeting)
      sessionToUse = await createNewSession(true);
      if (!sessionToUse) {
        setError('Failed to create chat session');
        setIsGenerating(false);
        return;
      }
    }

    // Check message limit
    if (sessionToUse.message_count >= MAX_MESSAGES_PER_SESSION - 1) {
      setError(`Message limit reached (${MAX_MESSAGES_PER_SESSION} messages per chat). Please start a new chat.`);
      setIsGenerating(false);
      return;
    }

    try {
      // Update session title with first user message if it's still "New Chat"
      // Do this BEFORE saving the message so we don't have timing issues
      if (sessionToUse.title === 'New Chat') {
        const newTitle = chatHistoryService.generateTitle(userMessage);
        const updated = await chatHistoryService.updateSessionTitle(sessionToUse.id, newTitle);
        if (updated) {
          setCurrentSession(updated);
          setSidebarRefreshTrigger(prev => prev + 1); // Refresh sidebar to show new title
        }
      }

      // Save user message to database
      const savedUserMessage = await saveMessageToDB('user', userMessage);
      if (!savedUserMessage) {
        console.warn('[Chat] Failed to save user message to DB');
      }

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
          messages: messages.filter((m) => m.role !== 'assistant' || m.content !== 'This is a placeholder response. Connect your AI service here!'),
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

      // Save assistant message to database
      if (assistantContent) {
        const savedAssistantMessage = await saveMessageToDB('assistant', assistantContent);
        if (!savedAssistantMessage) {
          console.warn('[Chat] Failed to save assistant message to DB');
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

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !userId) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    await sendMessageToAI(userMessage);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', position: 'relative' }}>
      {/* Main Chat Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin 0.3s',
          mr: { xs: 0, md: sidebarOpen ? '340px' : 0 },
          minWidth: 0, // Allow flex item to shrink below content size
        }}
      >
        {/* Header with title and actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h4" fontWeight={600} sx={{ flex: 1 }}>
            {currentSession?.title || 'AI Chat'}
          </Typography>
          <Button
            variant="outlined"
            onClick={createNewSession}
            disabled={loadingProviders || !selectedConfig}
            size="small"
            sx={{ mr: { xs: 0, md: 1 } }}
          >
            New Chat
          </Button>
          <IconButton
            onClick={() => setSidebarOpen(!sidebarOpen)}
            color={sidebarOpen ? 'primary' : 'default'}
            title={sidebarOpen ? 'Hide chat history' : 'Show chat history'}
          >
            <HistoryIcon />
          </IconButton>
        </Box>

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

      {currentSession && currentSession.message_count >= MAX_MESSAGES_PER_SESSION * 0.9 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={createNewSession}
            >
              New Chat
            </Button>
          }
        >
          Approaching message limit ({currentSession.message_count}/{MAX_MESSAGES_PER_SESSION}). Consider starting a new chat soon.
        </Alert>
      )}

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 4 } }}>
          <Stack spacing={{ xs: 2, sm: 4 }}>
            {messages.map((message, index) => {
              const isPromptMessage = index === 0 && message.role === 'user' && message.content.startsWith('Following prompt:');

              if (index === 0) {
                console.log('[Chat Render] First message:', {
                  index,
                  role: message.role,
                  contentStart: message.content.substring(0, 30),
                  isPromptMessage,
                  hasCurrentPrompt: !!currentPrompt,
                  currentPromptTitle: currentPrompt?.title,
                  willRenderCard: isPromptMessage && !!currentPrompt,
                });
              }

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

      {/* Chat History Sidebar */}
      <ChatHistoryList
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSessionId={currentSession?.id || null}
        onSessionClick={loadSession}
        onNewChat={createNewSession}
        refreshTrigger={sidebarRefreshTrigger}
      />
    </Box>
  );
}
