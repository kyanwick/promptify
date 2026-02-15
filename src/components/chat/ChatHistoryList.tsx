'use client';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  IconButton,
  Typography,
  TextField,
  Button,
  Divider,
  Skeleton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import {
  chatHistoryService,
  MAX_SESSIONS_PER_USER,
  type ChatSession,
} from '@/services/chatHistoryService';

interface ChatHistoryListProps {
  open: boolean;
  onClose: () => void;
  currentSessionId: string | null;
  onSessionClick: (sessionId: string) => void;
  onNewChat: () => void;
  refreshTrigger?: number; // Optional trigger to force refresh
}

interface GroupedSessions {
  today: ChatSession[];
  yesterday: ChatSession[];
  lastWeek: ChatSession[];
  older: ChatSession[];
}

export default function ChatHistoryList({
  open,
  onClose,
  currentSessionId,
  onSessionClick,
  onNewChat,
  refreshTrigger,
}: ChatHistoryListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  // Load sessions on mount and when refresh is triggered
  useEffect(() => {
    loadSessions();
  }, [refreshTrigger]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const allSessions = await chatHistoryService.getAllSessions(MAX_SESSIONS_PER_USER);
      setSessions(allSessions);
    } catch (err) {
      console.error('[ChatHistoryList] Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group sessions by time period
  const groupSessions = (sessions: ChatSession[]): GroupedSessions => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const grouped: GroupedSessions = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: [],
    };

    sessions.forEach((session) => {
      const sessionDate = new Date(session.updated_at);
      if (sessionDate >= today) {
        grouped.today.push(session);
      } else if (sessionDate >= yesterday) {
        grouped.yesterday.push(session);
      } else if (sessionDate >= lastWeek) {
        grouped.lastWeek.push(session);
      } else {
        grouped.older.push(session);
      }
    });

    return grouped;
  };

  // Filter sessions by search query
  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSessions = groupSessions(filteredSessions);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, session: ChatSession) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSession(null);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    if (selectedSession) {
      setDeletingSession(selectedSession.id);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSession) return;

    try {
      const success = await chatHistoryService.deleteSession(deletingSession);
      if (success) {
        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== deletingSession));

        // If deleted session was current, trigger new chat
        if (deletingSession === currentSessionId) {
          onNewChat();
        }
      }
    } catch (err) {
      console.error('[ChatHistoryList] Failed to delete session:', err);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingSession(null);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    onSessionClick(sessionId);
    if (isMobile) {
      onClose();
    }
  };

  const handleNewChatClick = () => {
    onNewChat();
    if (isMobile) {
      onClose();
    }
  };

  const renderSessionGroup = (title: string, sessions: ChatSession[]) => {
    if (sessions.length === 0) return null;

    return (
      <>
        <ListSubheader
          sx={{
            bgcolor: 'background.paper',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'text.secondary',
            py: 1,
          }}
        >
          {title}
        </ListSubheader>
        {sessions.map((session) => (
          <ListItemButton
            key={session.id}
            selected={session.id === currentSessionId}
            onClick={() => handleSessionClick(session.id)}
            sx={{
              py: 1.5,
              px: 2,
              '&.Mui-selected': {
                bgcolor: 'action.selected',
                borderLeft: '3px solid',
                borderColor: 'primary.main',
              },
            }}
          >
            <ListItemText
              primary={session.title}
              secondary={`${session.message_count} messages`}
              primaryTypographyProps={{
                noWrap: true,
                fontSize: '0.9rem',
                fontWeight: session.id === currentSessionId ? 600 : 400,
              }}
              secondaryTypographyProps={{
                fontSize: '0.75rem',
              }}
            />
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, session)}
              sx={{ ml: 1 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        ))}
      </>
    );
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Chat History
        </Typography>
        {isMobile && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Search bar */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* New Chat button */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewChatClick}
        >
          New Chat
        </Button>
      </Box>

      <Divider />

      {/* Session list */}
      <List
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 0,
        }}
      >
        {loading ? (
          // Loading skeletons
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ px: 2, py: 1.5 }}>
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="40%" />
              </Box>
            ))}
          </>
        ) : filteredSessions.length === 0 ? (
          // Empty state
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {searchQuery ? 'No conversations found' : 'No chat history yet'}
            </Typography>
            {!searchQuery && (
              <Typography variant="caption" color="text.secondary">
                Start a conversation to see it here
              </Typography>
            )}
          </Box>
        ) : (
          // Grouped sessions
          <>
            {renderSessionGroup('Today', groupedSessions.today)}
            {renderSessionGroup('Yesterday', groupedSessions.yesterday)}
            {renderSessionGroup('Last 7 Days', groupedSessions.lastWeek)}
            {renderSessionGroup('Older', groupedSessions.older)}
          </>
        )}
      </List>

      {/* Storage usage indicator */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'action.hover',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {sessions.length}/{MAX_SESSIONS_PER_USER} conversations
        </Typography>
        {sessions.length >= MAX_SESSIONS_PER_USER * 0.9 && (
          <Typography variant="caption" color="warning.main" display="block">
            Approaching storage limit
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        variant={isMobile ? 'temporary' : 'persistent'}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '85%', sm: 300, md: 340 },
            maxWidth: 400,
            boxSizing: 'border-box',
            top: { xs: 0, md: 64 }, // Adjust for app bar
            height: { xs: '100%', md: 'calc(100% - 64px)' },
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
        }}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Conversation?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete this conversation and all its messages. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
