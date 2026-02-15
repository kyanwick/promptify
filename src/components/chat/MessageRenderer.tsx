'use client';
import { Box, IconButton, Typography, Paper, Tooltip } from '@mui/material';
import { ContentCopy as CopyIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
}

export default function MessageRenderer({ content, isUser = false }: MessageRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Custom components for markdown rendering
  const components: Components = {
    // Headings
    h1: ({ children, ...props }) => (
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom sx={{ mt: 3, mb: 2 }} {...props}>
        {children}
      </Typography>
    ),
    h2: ({ children, ...props }) => (
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom sx={{ mt: 2.5, mb: 1.5 }} {...props}>
        {children}
      </Typography>
    ),
    h3: ({ children, ...props }) => (
      <Typography variant="h6" component="h3" fontWeight={600} gutterBottom sx={{ mt: 2, mb: 1 }} {...props}>
        {children}
      </Typography>
    ),
    h4: ({ children, ...props }) => (
      <Typography variant="subtitle1" component="h4" fontWeight={600} gutterBottom sx={{ mt: 1.5, mb: 0.5 }} {...props}>
        {children}
      </Typography>
    ),
    h5: ({ children, ...props }) => (
      <Typography variant="subtitle2" component="h5" fontWeight={600} gutterBottom sx={{ mt: 1.5, mb: 0.5 }} {...props}>
        {children}
      </Typography>
    ),
    h6: ({ children, ...props }) => (
      <Typography variant="subtitle2" component="h6" fontWeight={500} gutterBottom sx={{ mt: 1, mb: 0.5 }} {...props}>
        {children}
      </Typography>
    ),

    // Paragraph
    p: ({ children, ...props }) => (
      <Typography
        variant="body1"
        component="p"
        sx={{
          mb: 2,
          lineHeight: 1.7,
          '&:last-child': { mb: 0 },
        }}
        {...props}
      >
        {children}
      </Typography>
    ),

    // Strong (bold)
    strong: ({ children, ...props }) => (
      <Box component="strong" sx={{ fontWeight: 700 }} {...props}>
        {children}
      </Box>
    ),

    // Emphasis (italic)
    em: ({ children, ...props }) => (
      <Box component="em" sx={{ fontStyle: 'italic' }} {...props}>
        {children}
      </Box>
    ),

    // Inline code
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const codeString = String(children).replace(/\n$/, '');

      if (inline) {
        // Inline code
        return (
          <Box
            component="code"
            sx={{
              px: 0.8,
              py: 0.3,
              bgcolor: 'action.hover',
              borderRadius: 0.5,
              fontFamily: 'monospace',
              fontSize: '0.9em',
              border: '1px solid',
              borderColor: 'divider',
            }}
            {...props}
          >
            {children}
          </Box>
        );
      }

      // Code block
      return (
        <Paper
          sx={{
            my: 2,
            position: 'relative',
            bgcolor: '#1e1e1e',
            borderRadius: 2,
            overflow: 'hidden',
            maxWidth: '100%',
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
                fontSize: { xs: '0.65rem', sm: '0.75rem' },
              }}
            >
              {language}
            </Typography>
            <Tooltip title={copiedCode === codeString ? 'Copied!' : 'Copy code'}>
              <IconButton
                size="small"
                onClick={() => handleCopy(codeString)}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  p: { xs: 0.5, sm: 1 },
                }}
              >
                {copiedCode === codeString ? (
                  <CheckIcon fontSize="small" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                ) : (
                  <CopyIcon fontSize="small" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              maxHeight: { xs: '300px', sm: '400px' },
              overflow: 'auto',
              '& pre': {
                margin: '0 !important',
              },
            }}
          >
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '12px',
                background: 'transparent',
                fontSize: '13px',
              }}
              showLineNumbers={false}
              wrapLines={true}
              wrapLongLines={true}
            >
              {codeString}
            </SyntaxHighlighter>
          </Box>
        </Paper>
      );
    },

    // Blockquote
    blockquote: ({ children, ...props }) => (
      <Box
        component="blockquote"
        sx={{
          pl: 2,
          py: 0.5,
          my: 2,
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
          fontStyle: 'italic',
          '& > *': {
            mb: 0,
          },
        }}
        {...props}
      >
        {children}
      </Box>
    ),

    // Unordered list
    ul: ({ children, ...props }) => (
      <Box
        component="ul"
        sx={{
          pl: 3,
          my: 1.5,
          '& li': {
            mb: 0.5,
          },
        }}
        {...props}
      >
        {children}
      </Box>
    ),

    // Ordered list
    ol: ({ children, ...props }) => (
      <Box
        component="ol"
        sx={{
          pl: 3,
          my: 1.5,
          '& li': {
            mb: 0.5,
          },
        }}
        {...props}
      >
        {children}
      </Box>
    ),

    // List item
    li: ({ children, ...props }) => (
      <Typography component="li" variant="body1" sx={{ lineHeight: 1.7 }} {...props}>
        {children}
      </Typography>
    ),

    // Links
    a: ({ href, children, ...props }) => (
      <Box
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: 'primary.main',
          textDecoration: 'underline',
          '&:hover': {
            textDecoration: 'none',
          },
        }}
        {...props}
      >
        {children}
      </Box>
    ),

    // Horizontal rule
    hr: (props) => (
      <Box
        component="hr"
        sx={{
          my: 3,
          border: 'none',
          borderTop: '2px solid',
          borderColor: 'divider',
        }}
        {...props}
      />
    ),

    // Table
    table: ({ children, ...props }) => (
      <Box sx={{ overflowX: 'auto', my: 2 }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            '& th, & td': {
              border: '1px solid',
              borderColor: 'divider',
              px: 2,
              py: 1,
              textAlign: 'left',
            },
            '& th': {
              bgcolor: 'action.hover',
              fontWeight: 600,
            },
          }}
          {...props}
        >
          {children}
        </Box>
      </Box>
    ),

    // Images
    img: ({ src, alt, ...props }) => (
      <Box
        component="img"
        src={src}
        alt={alt}
        sx={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: 1,
          my: 2,
          display: 'block',
        }}
        {...props}
      />
    ),
  };

  return (
    <Box
      sx={{
        maxWidth: '100%',
        overflow: 'hidden',
        wordBreak: 'break-word',
        '& > *:first-of-type': {
          mt: 0,
        },
        '& > *:last-child': {
          mb: 0,
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
