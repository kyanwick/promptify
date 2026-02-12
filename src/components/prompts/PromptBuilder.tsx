'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Button,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  TextField,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  Description as DescriptionIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as ZoomResetIcon,
  Person as PersonIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import PromptNode from './PromptNode';
import NodeConnection from './NodeConnection';
import PromptPreview from './PromptPreview';
import { Node, Connection } from './types';
import { promptService } from '@/services/promptService';

export default function PromptBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptTitle, setPromptTitle] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Track unsaved changes
  useEffect(() => {
    if (nodes.length > 0 || connections.length > 0 || promptTitle.trim()) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, connections, promptTitle]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const addNode = (type: 'system' | 'user') => {
    const maxX = isMobile ? 50 : 300;
    const maxY = isMobile ? 50 : 200;
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      title: type === 'system' ? 'System Message' : 'User Prompt',
      x: Math.random() * maxX + 20,
      y: Math.random() * maxY + 20,
      width: isMobile ? 280 : 300,
      height: isMobile ? 140 : 150,
      content: '',
      hidden: type === 'system' ? true : false,
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (id: string, updates: Partial<Node>) => {
    setNodes(nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)));
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter((node) => node.id !== id));
    // Also delete any connections involving this node
    setConnections(connections.filter((conn) => conn.sourceId !== id && conn.targetId !== id));
  };

  const handleConnectionStart = (nodeId: string) => {
    if (connectionStart === null) {
      // Start connection
      setConnectionStart(nodeId);
    } else {
      // Complete connection
      if (connectionStart === nodeId) {
        // Prevent self-connection
        setSnackbar({
          open: true,
          message: 'Cannot connect a node to itself',
          severity: 'error',
        });
        setConnectionStart(null);
        return;
      }
      
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        sourceId: connectionStart,
        targetId: nodeId,
      };
      setConnections([...connections, newConnection]);
      setConnectionStart(null);
    }
  };

  const validateConnections = (): { valid: boolean; message?: string } => {
    const systemMessages = nodes.filter(n => n.type === 'system');
    const userPrompts = nodes.filter(n => n.type === 'user');
    
    // Check minimum requirements
    if (systemMessages.length === 0 && userPrompts.length === 0) {
      return { valid: false, message: 'Please add at least one System Message and one User Prompt' };
    }
    
    if (systemMessages.length === 0) {
      return { valid: false, message: 'Please add at least one System Message' };
    }
    
    if (userPrompts.length === 0) {
      return { valid: false, message: 'Please add at least one User Prompt' };
    }

    // Only check connections if there are 2+ user prompts
    // A single user prompt doesn't need to be connected to anything
    if (userPrompts.length > 1) {
      const disconnectedNodes = userPrompts.filter(node => {
        const hasConnection = connections.some(
          conn => conn.sourceId === node.id || conn.targetId === node.id
        );
        return !hasConnection;
      });

      if (disconnectedNodes.length > 0) {
        if (disconnectedNodes.length === 1) {
          return {
            valid: false,
            message: `User Prompt "${disconnectedNodes[0].title}" is not connected. All user prompts must be connected to show the flow.`,
          };
        } else {
          return {
            valid: false,
            message: `${disconnectedNodes.length} User Prompts are not connected. All user prompts must be connected to show the flow.`,
          };
        }
      }
    }

    return { valid: true };
  };

  const saveDraft = () => {
    const validation = validateConnections();
    if (!validation.valid) {
      setSnackbar({
        open: true,
        message: validation.message || 'Validation failed',
        severity: 'error',
      });
      return;
    }

    if (!promptTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a title for your prompt',
        severity: 'error',
      });
      return;
    }

    handleSave('draft');
  };

  const submitPrompt = () => {
    const validation = validateConnections();
    if (!validation.valid) {
      setSnackbar({
        open: true,
        message: validation.message || 'Validation failed',
        severity: 'error',
      });
      return;
    }

    if (!promptTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a title for your prompt',
        severity: 'error',
      });
      return;
    }

    handleSave('publish');
  };

  const handleSave = async (action: 'draft' | 'publish') => {
    if (!promptTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a title',
        severity: 'error',
      });
      return;
    }

    if (nodes.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add at least one node',
        severity: 'error',
      });
      return;
    }

    try {
      if (promptId) {
        // Update existing prompt
        if (action === 'publish') {
          await promptService.publish(promptId, {
            title: promptTitle,
            nodes,
            connections,
          });
        } else {
          await promptService.updatePrompt(promptId, {
            title: promptTitle,
            nodes,
            connections,
            status: 'draft',
          });
        }
      } else {
        // Create new prompt
        const result = await promptService.saveDraft({
          title: promptTitle,
          nodes,
          connections,
          status: action === 'publish' ? 'published' : 'draft',
        });
        if (result) {
          setPromptId(result.id);
        }
      }

      setSnackbar({
        open: true,
        message: action === 'publish' ? 'Prompt published successfully!' : 'Draft saved successfully!',
        severity: 'success',
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving prompt:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save prompt',
        severity: 'error',
      });
    }
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.25, Math.min(3, prev + delta)));
    }
  };

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      setInitialPinchDistance(distance);
      setInitialZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = initialZoom * scale;
      setZoom(Math.max(0.25, Math.min(3, newZoom)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setInitialPinchDistance(null);
    }
  };

  return (
    <Box
      sx={{
        height: { xs: 'calc(100vh - 180px)', sm: 'calc(100vh - 120px)' },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Conditional rendering based on mode */}
      {isPreviewMode ? (
        // Preview Mode
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={600}>
              {promptTitle || 'Preview Mode'}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsPreviewMode(false)}
            >
              Back to Editor
            </Button>
          </Stack>
          <Box sx={{ flex: 1, overflow: 'auto', height: '100%' }}>
            <PromptPreview nodes={nodes} />
          </Box>
        </Stack>
      ) : (
        // Edit Mode
        <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={{ xs: 2, sm: 0 }}
        mb={2}
      >
        <Box>
          <TextField
            variant="standard"
            value={promptTitle}
            onChange={(e) => setPromptTitle(e.target.value)}
            placeholder="Enter prompt title..."
            sx={{
              '& .MuiInputBase-input': {
                fontSize: isMobile ? '1.5rem' : '2.125rem',
                fontWeight: 600,
                padding: 0,
              },
              '& .MuiInput-root': {
                '&:before': {
                  borderBottom: '2px solid transparent',
                },
                '&:hover:not(.Mui-disabled):before': {
                  borderBottom: '2px solid rgba(0, 0, 0, 0.12)',
                },
                '&:after': {
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                },
              },
            }}
          />
          {hasUnsavedChanges && (
            <Typography
              variant="caption"
              sx={{
                color: 'warning.main',
                fontSize: '0.75rem',
                fontStyle: 'italic',
                mt: 0.5,
                display: 'block',
              }}
            >
              Unsaved changes
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'space-between', sm: 'flex-start' }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              size="small"
              onClick={zoomOut}
              disabled={zoom <= 0.25}
              sx={{ minWidth: isMobile ? 40 : 32, minHeight: isMobile ? 40 : 32 }}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <Typography
              variant="caption"
              sx={{
                minWidth: isMobile ? 50 : 45,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: isMobile ? 13 : 12,
              }}
            >
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton
              size="small"
              onClick={zoomIn}
              disabled={zoom >= 3}
              sx={{ minWidth: isMobile ? 40 : 32, minHeight: isMobile ? 40 : 32 }}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={resetZoom}
              sx={{ minWidth: isMobile ? 40 : 32, minHeight: isMobile ? 40 : 32 }}
            >
              <ZoomResetIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack direction="row" spacing={1}>
            {isMobile ? (
              <>
                <Tooltip title="Preview form">
                  <IconButton
                    color="primary"
                    onClick={() => {
                      const validation = validateConnections();
                      if (!validation.valid) {
                        setSnackbar({
                          open: true,
                          message: validation.message || 'Validation failed',
                          severity: 'error',
                        });
                        return;
                      }
                      setIsPreviewMode(true);
                    }}
                    disabled={nodes.filter(n => n.type === 'user').length === 0}
                    sx={{
                      border: 1,
                      borderColor: 'primary.main',
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  >
                    <PreviewIcon />
                  </IconButton>
                </Tooltip>
                <IconButton
                  color="primary"
                  onClick={saveDraft}
                  disabled={
                    nodes.filter(n => n.type === 'system').length === 0 ||
                    nodes.filter(n => n.type === 'user').length === 0
                  }
                  sx={{
                    border: 1,
                    borderColor: 'primary.main',
                    minWidth: 44,
                    minHeight: 44,
                  }}
                >
                  <SaveIcon />
                </IconButton>
                <Button
                  variant="contained"
                  onClick={submitPrompt}
                  disabled={
                    nodes.filter(n => n.type === 'system').length === 0 ||
                    nodes.filter(n => n.type === 'user').length === 0
                  }
                  sx={{ minHeight: 44 }}
                >
                  <SendIcon sx={{ mr: 0.5 }} />
                  Publish
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={() => {
                    const validation = validateConnections();
                    if (!validation.valid) {
                      setSnackbar({
                        open: true,
                        message: validation.message || 'Validation failed',
                        severity: 'error',
                      });
                      return;
                    }
                    setIsPreviewMode(true);
                  }}
                  disabled={nodes.filter(n => n.type === 'user').length === 0}
                >
                  Preview
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={saveDraft}
                  disabled={
                    nodes.filter(n => n.type === 'system').length === 0 ||
                    nodes.filter(n => n.type === 'user').length === 0
                  }
                >
                  Save Draft
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={submitPrompt}
                  disabled={
                    nodes.filter(n => n.type === 'system').length === 0 ||
                    nodes.filter(n => n.type === 'user').length === 0
                  }
                >
                  Publish
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          position: 'relative',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,.1) 1px, transparent 1px)',
          backgroundSize: isMobile ? '15px 15px' : '20px 20px',
          overflow: 'hidden',
          touchAction: 'none',
          cursor: connectionStart ? 'crosshair' : 'default',
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          // Cancel connection if clicking canvas
          if (connectionStart) {
            setConnectionStart(null);
          }
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
            position: 'relative',
          }}
        >
          {/* Render connections behind nodes */}
          {connections.map((connection) => (
            <NodeConnection
              key={connection.id}
              connection={connection}
              nodes={nodes}
              zoom={zoom}
            />
          ))}

          {nodes.map((node) => {
            // Check if this user prompt node is disconnected
            // Only mark as disconnected if there are 2+ user prompts and this one isn't connected
            const userPrompts = nodes.filter(n => n.type === 'user');
            const userPromptCount = userPrompts.length;
            const isDisconnected = 
              node.type === 'user' && 
              userPromptCount > 1 && 
              !connections.some(
                conn => conn.sourceId === node.id || conn.targetId === node.id
              );

            // Determine which connection circles to show
            let showInputCircle = true;
            let showOutputCircle = true;
            
            if (node.type === 'user') {
              if (userPromptCount === 1) {
                // Single user prompt: no circles
                showInputCircle = false;
                showOutputCircle = false;
              } else if (userPromptCount === 2) {
                // Two user prompts: first has output only, second has input only
                const nodeIndex = userPrompts.findIndex(n => n.id === node.id);
                if (nodeIndex === 0) {
                  // First prompt: output only (bottom circle)
                  showInputCircle = false;
                  showOutputCircle = true;
                } else {
                  // Second prompt: input only (top circle)
                  showInputCircle = true;
                  showOutputCircle = false;
                }
              } else {
                // 3+ user prompts: first has output only, last has input only, middle has both
                const nodeIndex = userPrompts.findIndex(n => n.id === node.id);
                if (nodeIndex === 0) {
                  // First: output only
                  showInputCircle = false;
                  showOutputCircle = true;
                } else if (nodeIndex === userPromptCount - 1) {
                  // Last: input only
                  showInputCircle = true;
                  showOutputCircle = false;
                } else {
                  // Middle: both
                  showInputCircle = true;
                  showOutputCircle = true;
                }
              }
            }

            return (
              <PromptNode
                key={node.id}
                node={node}
                onUpdate={updateNode}
                onDelete={deleteNode}
                isMobile={isMobile}
                onConnectionStart={handleConnectionStart}
                isConnecting={connectionStart !== null}
                isDisconnected={isDisconnected}
                showInputCircle={showInputCircle}
                showOutputCircle={showOutputCircle}
              />
            );
          })}

          {nodes.length === 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                px: 2,
              }}
            >
              <Typography variant={isMobile ? 'body1' : 'h6'} color="text.secondary" gutterBottom>
                Start building your prompt
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                mb={3}
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                Add at least one system message and one user prompt to create your workflow
              </Typography>
            </Box>
          )}

          {/* Connection mode indicator */}
          {connectionStart && (
            <Box
              sx={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 3,
                py: 1,
                borderRadius: 2,
                boxShadow: 3,
                zIndex: 1000,
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                Click on another node to connect • Click canvas to cancel
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={isMobile ? 1 : 2}
        mt={2}
      >
        {isMobile ? (
          <>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DescriptionIcon />}
              onClick={() => addNode('system')}
              sx={{ minHeight: 48 }}
            >
              Add System Message
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PersonIcon />}
              onClick={() => addNode('user')}
              sx={{ minHeight: 48 }}
            >
              Add User Prompt
            </Button>
          </>
        ) : (
          <>
            <Tooltip title="Add a system message node">
              <Button
                variant="outlined"
                startIcon={<DescriptionIcon />}
                onClick={() => addNode('system')}
              >
                Add System Message
              </Button>
            </Tooltip>
            <Tooltip title="Add a user prompt input field">
              <Button
                variant="outlined"
                startIcon={<PersonIcon />}
                onClick={() => addNode('user')}
              >
                Add User Prompt
              </Button>
            </Tooltip>
          </>
        )}
      </Stack>
        </>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
