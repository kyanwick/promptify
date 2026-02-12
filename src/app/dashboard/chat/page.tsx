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
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');

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
            {messages.map((message, index) => (
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
            ))}
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
