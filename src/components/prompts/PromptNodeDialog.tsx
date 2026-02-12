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
  Typography,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  SmartToy as SmartToyIcon,
  Close as CloseIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { PromptNodeDialogProps } from './types';

export default function PromptNodeDialog({
  open,
  node,
  onClose,
  onSave,
}: PromptNodeDialogProps) {
  const [expandedContent, setExpandedContent] = useState(node.content);

  useEffect(() => {
    if (open) {
      setExpandedContent(node.content);
    }
  }, [open, node.content]);

  const handleCancel = () => {
    setExpandedContent(node.content);
    onClose();
  };

  const handleSave = () => {
    onSave(node.id, { content: expandedContent });
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
              <>
                <DescriptionIcon />
                <Typography variant="h6" sx={{ opacity: 0.7 }}>
                  {node.title} (Hidden from users)
                </Typography>
              </>
            ) : node.type === 'user' ? (
              <>
                <PersonIcon />
                <Typography variant="h6">{node.title}</Typography>
              </>
            ) : (
              <>
                <SmartToyIcon />
                <Typography variant="h6">{node.title}</Typography>
              </>
            )}
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
              ? 'Enter system message (hidden from users, visible to AI)...'
              : node.type === 'user'
              ? 'Enter the prompt text users will see (e.g., "What is your favorite cuisine?")...'
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
