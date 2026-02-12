'use client';
import {
  Box,
  Card,
  TextField,
  IconButton,
  Paper,
  Typography,
  Stack,
  Avatar,
  Chip,
  Collapse,
} from '@mui/material';
import { Send as SendIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
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

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'This is a placeholder response. Connect your AI service here!',
        },
      ]);
    }, 1000);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        AI Chat
      </Typography>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Stack spacing={2}>
            {messages.map((message, index) => {
              const isPromptMessage = index === 0 && message.role === 'user' && message.content.startsWith('Following prompt:');
              
              if (isPromptMessage && currentPrompt) {
                return (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Card
                      sx={{
                        maxWidth: '70%',
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
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ maxWidth: '70%' }}>
                    {message.role === 'assistant' && (
                      <Avatar sx={{ bgcolor: 'primary.main' }}>AI</Avatar>
                    )}
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                        color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <Typography variant="body1">{message.content}</Typography>
                    </Paper>
                    {message.role === 'user' && (
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>U</Avatar>
                    )}
                  </Stack>
                </Box>
              );
            })}
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
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              multiline
              maxRows={4}
            />
            <IconButton color="primary" onClick={handleSend} disabled={!input.trim()}>
              <SendIcon />
            </IconButton>
          </Stack>
        </Box>
      </Card>
    </Box>
  );
}
