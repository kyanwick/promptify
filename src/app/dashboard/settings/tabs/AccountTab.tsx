'use client';

import {
  Box,
  Card,
  Button,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useUserId } from '@/hooks/useUserId';

export default function AccountTab() {
  const { userId } = useUserId();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
    setDeleteConfirmText('');
    setError(null);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeleteConfirmText('');
    setError(null);
  };

  const handleDeleteAccount = async () => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    try {
      if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
        setError('Please type "DELETE MY ACCOUNT" to confirm');
        return;
      }

      setIsDeleting(true);

      // Call delete account endpoint
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Clear local storage and redirect to signin
      localStorage.removeItem('userId');
      window.location.href = '/signin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Account Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account and privacy settings.
        </Typography>
      </Box>

      <Card sx={{ p: 3, bgcolor: 'error.light' }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={600} color="error.dark">
              Delete Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleOpenDeleteDialog}
            sx={{ width: 'fit-content' }}
          >
            Delete Account
          </Button>
        </Stack>
      </Card>

      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.light' }}>
          Delete Account Permanently?
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Alert severity="warning">
              This action is permanent and cannot be undone. All your data, prompts, and API keys
              will be deleted.
            </Alert>

            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                To confirm, type this text in the field below:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                  my: 1,
                }}
              >
                DELETE MY ACCOUNT
              </Typography>
            </Box>

            <Box
              component="input"
              type="text"
              placeholder="Type DELETE MY ACCOUNT"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              sx={{
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            variant="contained"
            color="error"
            disabled={isDeleting || deleteConfirmText !== 'DELETE MY ACCOUNT'}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
