'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  Stack,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Visibility as VisibilityIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { promptService, type SavedPrompt } from '@/services/promptService';
import PromptPreview from './PromptPreview';
import { useRouter } from 'next/navigation';
import { usePromptChat } from '@/context/PromptChatContext';

type FilterTab = 'all' | 'draft' | 'published';
type SortOption = 'updated' | 'created' | 'title';

export function PromptLibrary() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { setChatData } = usePromptChat();

  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<SavedPrompt | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'preview' | 'fillAndChat'>('preview');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  // Filter and sort prompts when data or filters change
  useEffect(() => {
    let filtered = [...prompts];

    // Apply filter
    if (filterTab === 'draft') {
      filtered = filtered.filter((p) => p.status === 'draft');
    } else if (filterTab === 'published') {
      filtered = filtered.filter((p) => p.status === 'published');
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        // title
        return a.title.localeCompare(b.title);
      }
    });

    setFilteredPrompts(filtered);
  }, [prompts, filterTab, sortBy]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data = await promptService.getAllPrompts();
      setPrompts(data);
    } catch (error) {
      console.error('Error loading prompts:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load prompts',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, prompt: SavedPrompt) => {
    setAnchorEl(event.currentTarget);
    setSelectedPrompt(prompt);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedPrompt) {
      router.push(`/dashboard/prompts/${selectedPrompt.id}`);
    }
    handleMenuClose();
  };

  const handleDuplicate = async () => {
    if (!selectedPrompt) return;

    try {
      const duplicate = await promptService.duplicatePrompt(selectedPrompt.id);
      if (duplicate) {
        setSnackbar({
          open: true,
          message: 'Prompt duplicated successfully!',
          severity: 'success',
        });
        await loadPrompts();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to duplicate prompt',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      setSnackbar({
        open: true,
        message: 'Failed to duplicate prompt',
        severity: 'error',
      });
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPrompt) return;

    try {
      const success = await promptService.deletePrompt(selectedPrompt.id);
      if (success) {
        setSnackbar({
          open: true,
          message: 'Prompt deleted successfully!',
          severity: 'success',
        });
        await loadPrompts();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to delete prompt',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete prompt',
        severity: 'error',
      });
    }
    setDeleteDialogOpen(false);
  };

  const handleShare = async () => {
    if (!selectedPrompt) return;

    try {
      // Toggle public status
      const newPublicStatus = !selectedPrompt.is_public;
      const success = await promptService.togglePublic(selectedPrompt.id, newPublicStatus);

      if (success) {
        if (newPublicStatus) {
          // Copy link to clipboard
          const shareUrl = `${window.location.origin}/share/${selectedPrompt.id}`;
          await navigator.clipboard.writeText(shareUrl);
          setSnackbar({
            open: true,
            message: 'Link copied! Prompt is now public.',
            severity: 'success',
          });
        } else {
          setSnackbar({
            open: true,
            message: 'Prompt is now private.',
            severity: 'success',
          });
        }
        await loadPrompts();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to update sharing settings',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error sharing prompt:', error);
      setSnackbar({
        open: true,
        message: 'Failed to copy link',
        severity: 'error',
      });
    }
    handleMenuClose();
  };

  const handlePreview = () => {
    setPreviewMode('preview');
    setPreviewDialogOpen(true);
    handleMenuClose();
  };

  const handleCreateNew = () => {
    router.push('/dashboard/prompts/new');
  };

  const handleUseThisPrompt = () => {
    setPreviewMode('fillAndChat');
    setPreviewDialogOpen(true);
    handleMenuClose();
  };

  const handleFormSubmit = (responses: Record<string, string>) => {
    if (!selectedPrompt) return;

    // Save to context for the chat to access
    setChatData({
      prompt: selectedPrompt,
      responses,
    });

    // Close the dialog and navigate to chat
    setPreviewDialogOpen(false);
    router.push('/dashboard/chat');
  };

  // Empty state
  if (!loading && prompts.length === 0) {
    return (
      <Box
        sx={{
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Typography variant="h2" sx={{ fontSize: '4rem', mb: 2 }}>
          📝
        </Typography>
        <Typography variant="h5" gutterBottom>
          No prompts yet
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
          Create your first prompt to get started building interactive forms and workflows.
        </Typography>
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={handleCreateNew}>
          Create Your First Prompt
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header with Tabs and Sort */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} mb={3}>
        <Box flex={1}>
          <Tabs value={filterTab} onChange={(_, value) => setFilterTab(value)}>
            <Tab label="All" value="all" />
            <Tab label="Drafts" value="draft" />
            <Tab label="Published" value="published" />
          </Tabs>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort by</InputLabel>
          <Select value={sortBy} label="Sort by" onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <MenuItem value="updated">Last Updated</MenuItem>
            <MenuItem value="created">Date Created</MenuItem>
            <MenuItem value="title">Title (A-Z)</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Prompt Grid */}
      {!loading && filteredPrompts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No prompts found for this filter
          </Typography>
        </Box>
      )}

      {!loading && filteredPrompts.length > 0 && (
        <Grid container spacing={2}>
          {filteredPrompts.map((prompt) => (
            <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }} key={prompt.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => {
                  setSelectedPrompt(prompt);
                  setPreviewMode('fillAndChat');
                  setPreviewDialogOpen(true);
                }}
              >
                <CardContent sx={{ flex: 1, pb: 1 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flex={1} minWidth={0}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontSize: '2rem',
                          lineHeight: 1,
                        }}
                      >
                        {prompt.emoji || '📝'}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {prompt.title}
                      </Typography>
                    </Stack>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, prompt);
                      }}
                      sx={{ mt: -0.5, mr: -0.5 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  {/* Status and Public Indicator */}
                  <Stack direction="row" spacing={0.5} mt={1.5}>
                    <Chip
                      label={prompt.status}
                      size="small"
                      color={prompt.status === 'published' ? 'success' : 'default'}
                      sx={{ textTransform: 'capitalize', fontSize: '0.7rem', height: 20 }}
                    />
                    {prompt.is_public && (
                      <Chip
                        icon={<PublicIcon sx={{ fontSize: '0.9rem' }} />}
                        label="Public"
                        size="small"
                        color="info"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAB for Create New */}
      <Fab
        color="primary"
        aria-label="create new prompt"
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
        }}
        onClick={handleCreateNew}
      >
        <AddIcon />
      </Fab>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleUseThisPrompt} sx={{ bgcolor: 'primary.lighter' }}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" sx={{ color: 'primary.main' }} />
          </ListItemIcon>
          <ListItemText sx={{ color: 'primary.main' }}>
            <strong>Use This Prompt</strong>
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleShare}>
          <ListItemIcon>
            {selectedPrompt?.is_public ? <LockIcon fontSize="small" /> : <ShareIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{selectedPrompt?.is_public ? 'Make Private' : 'Share (Copy Link)'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePreview}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Prompt?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedPrompt?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ bgcolor: previewMode === 'fillAndChat' ? 'background.default' : 'transparent' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6">{previewMode === 'fillAndChat' ? 'Fill & Chat' : 'Preview'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedPrompt?.title}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: previewMode === 'fillAndChat' ? 'background.default' : 'transparent' }}>
          {selectedPrompt && (
            <PromptPreview
              nodes={selectedPrompt.nodes}
              onSubmit={previewMode === 'fillAndChat' ? handleFormSubmit : undefined}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: previewMode === 'fillAndChat' ? 'background.default' : 'transparent' }}>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
