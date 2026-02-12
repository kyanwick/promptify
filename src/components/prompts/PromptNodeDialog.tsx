'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  IconButton,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  SmartToy as SmartToyIcon,
  Close as CloseIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { PromptNodeDialogProps } from './types';

export default function PromptNodeDialog({
  open,
  node,
  onClose,
  onSave,
}: PromptNodeDialogProps) {
  const [expandedContent, setExpandedContent] = useState(node.content);
  const [expandedTitle, setExpandedTitle] = useState(node.title);

  useEffect(() => {
    if (open) {
      setExpandedContent(node.content);
      setExpandedTitle(node.title);
    }
  }, [open, node.content, node.title]);

  const handleCancel = () => {
    setExpandedContent(node.content);
    setExpandedTitle(node.title);
    onClose();
  };

  const handleSave = () => {
    onSave(node.id, { content: expandedContent, title: expandedTitle });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1} flex={1}>
            {node.type === 'system' ? (
              <DescriptionIcon />
            ) : (
              <SmartToyIcon />
            )}
            <TextField
              value={expandedTitle}
              onChange={(e) => setExpandedTitle(e.target.value)}
              variant="standard"
              fullWidth
              placeholder="Enter title..."
              InputProps={{
                startAdornment: (
                  <EditIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                ),
                style: {
                  fontSize: 20,
                  fontWeight: 600,
                },
              }}
              sx={{
                '& .MuiInput-root': {
                  '&:before': {
                    borderBottom: '2px solid rgba(0, 0, 0, 0.12)',
                  },
                  '&:hover:not(.Mui-disabled):before': {
                    borderBottom: '2px solid rgba(0, 0, 0, 0.42)',
                  },
                },
              }}
            />
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <TextField
          multiline
          fullWidth
          minRows={15}
          value={expandedContent}
          onChange={(e) => setExpandedContent(e.target.value)}
          placeholder={
            node.type === 'system'
              ? 'Enter system message...'
              : 'Enter your AI prompt...'
          }
          variant="outlined"
          autoFocus
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: 14,
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
