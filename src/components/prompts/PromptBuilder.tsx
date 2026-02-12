'use client';
import { useState } from 'react';
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
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  Description as DescriptionIcon,
  SmartToy as SmartToyIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as ZoomResetIcon,
} from '@mui/icons-material';
import PromptNode from './PromptNode';
import { Node } from './types';

export default function PromptBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [zoom, setZoom] = useState(1);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const addNode = (type: 'system' | 'prompt') => {
    const maxX = isMobile ? 50 : 300;
    const maxY = isMobile ? 50 : 200;
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      title: type === 'system' ? 'System Message' : 'AI Prompt',
      x: Math.random() * maxX + 20,
      y: Math.random() * maxY + 20,
      width: isMobile ? 280 : 300,
      height: isMobile ? 140 : 150,
      content: '',
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (id: string, updates: Partial<Node>) => {
    setNodes(nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)));
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter((node) => node.id !== id));
  };

  const saveDraft = () => {
    console.log('Saving draft:', nodes);
    // TODO: Save to Supabase
    alert('Draft saved! (Check console for data)');
  };

  const submitPrompt = () => {
    console.log('Submitting prompt:', nodes);
    // TODO: Process and send to AI
    alert('Prompt submitted! (Check console for data)');
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={{ xs: 2, sm: 0 }}
        mb={2}
      >
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={600}>
          Prompt Builder
        </Typography>
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
                <IconButton
                  color="primary"
                  onClick={saveDraft}
                  disabled={nodes.length === 0}
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
                  disabled={nodes.length === 0}
                  sx={{ minHeight: 44 }}
                >
                  <SendIcon sx={{ mr: 0.5 }} />
                  Submit
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={saveDraft}
                  disabled={nodes.length === 0}
                >
                  Save Draft
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={submitPrompt}
                  disabled={nodes.length === 0}
                >
                  Submit
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
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          {nodes.map((node) => (
            <PromptNode
              key={node.id}
              node={node}
              onUpdate={updateNode}
              onDelete={deleteNode}
              isMobile={isMobile}
            />
          ))}

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
                Add system messages and AI prompts to create your workflow
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
              startIcon={<SmartToyIcon />}
              onClick={() => addNode('prompt')}
              sx={{ minHeight: 48 }}
            >
              Add AI Prompt
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
            <Tooltip title="Add an AI prompt node">
              <Button
                variant="outlined"
                startIcon={<SmartToyIcon />}
                onClick={() => addNode('prompt')}
              >
                Add AI Prompt
              </Button>
            </Tooltip>
          </>
        )}
      </Stack>
    </Box>
  );
}
