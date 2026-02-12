'use client';
import {
  Box,
  Card,
  TextField,
  IconButton,
  Typography,
  Stack,
  Collapse,
} from '@mui/material';
import { Send as SendIcon, ExpandMore as ExpandMoreIcon, Stop as StopIcon } from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';
import { usePromptChat } from '@/context/PromptChatContext';
import { SavedPrompt } from '@/services/promptService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;

    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    setIsGenerating(true);

    // Simulate AI response
    const timeout = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'This is a placeholder response. Connect your AI service here!',
        },
      ]);
      setIsGenerating(false);
      timeoutIdRef.current = null;
    }, 1000);

    timeoutIdRef.current = timeout;
  };

  const handleStop = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    setIsGenerating(false);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        AI Chat
      </Typography>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
          <Stack spacing={4}>
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
                      <Box sx={{ p: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <Typography variant="h5">{currentPrompt.emoji}</Typography>
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight={600}>
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
                          maxWidth: '70%',
                          p: 2,
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
                      <Typography
                        variant="body1"
                        sx={{
                          lineHeight: 1.8,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          color: 'text.primary',
                        }}
                      >
                        {message.content}
                      </Typography>
                    </>
                  )}
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Stack>
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
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
