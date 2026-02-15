'use client';
import { Box, IconButton, Typography, Paper, Tooltip } from '@mui/material';
import { ContentCopy as CopyIcon, Download as DownloadIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
}

interface CodeBlock {
  language: string;
  code: string;
  index: number;
}

interface ImageBlock {
  url: string;
  alt?: string;
  index: number;
}

export default function MessageRenderer({ content, isUser = false }: MessageRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Parse code blocks from markdown
  const parseContent = (text: string) => {
    const parts: Array<{ type: 'text' | 'code' | 'image'; content: any; index: number }> = [];
    let lastIndex = 0;
    let partIndex = 0;

    // Regex for code blocks: ```language\ncode\n```
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    // Regex for images: ![alt](url) or just image URLs
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)|https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/gi;

    let match;

    // Find all code blocks
    const codeMatches: Array<{ match: RegExpExecArray; index: number }> = [];
    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeMatches.push({ match, index: match.index });
    }

    // Find all images
    const imageMatches: Array<{ match: RegExpExecArray; index: number }> = [];
    const tempText = text;
    imageRegex.lastIndex = 0;
    while ((match = imageRegex.exec(tempText)) !== null) {
      // Skip if this image is inside a code block
      const isInCodeBlock = codeMatches.some(
        (cm) => match!.index >= cm.index && match!.index < cm.index + cm.match[0].length
      );
      if (!isInCodeBlock) {
        imageMatches.push({ match, index: match.index });
      }
    }

    // Combine and sort all matches by position
    const allMatches = [
      ...codeMatches.map((m) => ({ ...m, type: 'code' as const })),
      ...imageMatches.map((m) => ({ ...m, type: 'image' as const })),
    ].sort((a, b) => a.index - b.index);

    // Build parts array
    allMatches.forEach(({ match, index, type }) => {
      // Add text before this match
      if (index > lastIndex) {
        const textContent = text.slice(lastIndex, index);
        if (textContent.trim()) {
          parts.push({ type: 'text', content: textContent, index: partIndex++ });
        }
      }

      if (type === 'code') {
        const language = match[1] || 'text';
        const code = match[2].trim();
        parts.push({ type: 'code', content: { language, code }, index: partIndex++ });
      } else if (type === 'image') {
        const url = match[2] || match[0];
        const alt = match[1] || 'Image';
        parts.push({ type: 'image', content: { url, alt }, index: partIndex++ });
      }

      lastIndex = index + match[0].length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const textContent = text.slice(lastIndex);
      if (textContent.trim()) {
        parts.push({ type: 'text', content: textContent, index: partIndex++ });
      }
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content: text, index: 0 }];
  };

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownloadImage = (url: string, alt: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = alt || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parts = parseContent(content);

  return (
    <Box>
      {parts.map((part) => {
        if (part.type === 'code') {
          const { language, code } = part.content;
          return (
            <Paper
              key={part.index}
              sx={{
                my: 2,
                position: 'relative',
                bgcolor: '#1e1e1e',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {language}
                </Typography>
                <Tooltip title={copiedIndex === part.index ? 'Copied!' : 'Copy code'}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(code, part.index)}
                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    {copiedIndex === part.index ? (
                      <CheckIcon fontSize="small" />
                    ) : (
                      <CopyIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    background: 'transparent',
                    fontSize: '14px',
                  }}
                  showLineNumbers
                >
                  {code}
                </SyntaxHighlighter>
              </Box>
            </Paper>
          );
        } else if (part.type === 'image') {
          const { url, alt } = part.content;
          return (
            <Box
              key={part.index}
              sx={{
                my: 2,
                position: 'relative',
                display: 'inline-block',
                maxWidth: '100%',
              }}
            >
              <Paper
                sx={{
                  p: 1,
                  display: 'inline-block',
                  position: 'relative',
                }}
              >
                <Box
                  component="img"
                  src={url}
                  alt={alt}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: 1,
                    display: 'block',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <Tooltip title="Download image">
                  <IconButton
                    size="small"
                    onClick={() => handleDownloadImage(url, alt)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Paper>
            </Box>
          );
        } else {
          // Regular text - preserve line breaks and format
          return (
            <Typography
              key={part.index}
              variant="body1"
              component="div"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.8,
                '& a': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
            >
              {part.content}
            </Typography>
          );
        }
      })}
    </Box>
  );
}
