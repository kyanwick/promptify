'use client';
import { useState } from 'react';
import { Paper, Stack, TextField, IconButton, Typography, Box } from '@mui/material';
import {
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  OpenInFull as ExpandIcon,
  Person as PersonIcon,
  CircleOutlined as CircleIcon,
} from '@mui/icons-material';
import { Rnd } from 'react-rnd';
import { NodeComponentProps } from './types';
import PromptNodeDialog from './PromptNodeDialog';

export default function PromptNode({
  node,
  onUpdate,
  onDelete,
  isMobile,
  onConnectionStart,
  isConnecting,
}: NodeComponentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Rnd
        position={{
          x: node.x,
          y: node.y,
        }}
        size={{
          width: node.width,
          height: node.height,
        }}
        bounds="parent"
        enableResizing={false}
        enableUserSelectHack={false}
        onDragStop={(e, d) => {
          onUpdate(node.id, { x: d.x, y: d.y });
        }}
        style={{
          zIndex: 1,
        }}
        dragHandleClassName="drag-handle"
      >
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            height: '100%',
            p: isMobile ? 1.5 : 2,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: node.type === 'system' ? 'background.paper' : 'secondary.light',
            border: 2,
            borderColor: node.type === 'system' ? 'secondary.main' : 'info.main',
            touchAction: 'none',
            position: 'relative',
            '&:hover': {
              boxShadow: 6,
            },
          }}
        >
          {/* Input connection handle (top) - only for user prompts */}
          {node.type === 'user' && (
            <Box
              sx={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              cursor: isConnecting ? 'pointer' : 'default',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (isConnecting && onConnectionStart) {
                onConnectionStart(node.id);
              }
            }}
          >
            <CircleIcon
              sx={{
                fontSize: 16,
                color: 'primary.main',
                bgcolor: 'background.paper',
                borderRadius: '50%',
                '&:hover': {
                  fontSize: 20,
                },
              }}
            />
          </Box>
          )}

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={1}
            className="drag-handle"
            sx={{ cursor: 'move', minHeight: isMobile ? 40 : 30 }}
          >
          <Stack direction="row" alignItems="center" spacing={1} flex={1}>
            {node.type === 'system' ? (
              <>
                <DescriptionIcon fontSize={isMobile ? 'medium' : 'small'} />
                <Typography
                  variant="caption"
                  fontWeight={600}
                  fontSize={isMobile ? 14 : 12}
                  sx={{ opacity: 0.7 }}
                >
                  {node.title} (Hidden from users)
                </Typography>
              </>
            ) : (
              <>
                <PersonIcon fontSize={isMobile ? 'medium' : 'small'} />
                <Typography variant="caption" fontWeight={600} fontSize={isMobile ? 14 : 12}>
                  {node.title}
                </Typography>
              </>
            )}
          </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setDialogOpen(true);
                }}
                sx={{ minWidth: isMobile ? 40 : 28, minHeight: isMobile ? 40 : 28 }}
              >
                <ExpandIcon fontSize="small" />
              </IconButton>
              <IconButton
                size={isMobile ? 'medium' : 'small'}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node.id);
                }}
                sx={{ minWidth: isMobile ? 44 : 32, minHeight: isMobile ? 44 : 32 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
          <TextField
            multiline
            fullWidth
            maxRows={isMobile ? 2 : 3}
            value={node.content}
            onChange={(e) => onUpdate(node.id, { content: e.target.value })}
            placeholder={
              node.type === 'system'
                ? 'Enter system message (hidden from users, visible to AI)...'
                : 'Enter the prompt text users will see (e.g., "What is your favorite cuisine?")...'
            }
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                alignItems: 'flex-start',
                fontSize: isMobile ? 14 : 13,
                overflow: 'auto',
              },
              '& .MuiInputBase-input': {
                overflow: 'auto !important',
              },
            }}
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Output connection handle (bottom) - only for user prompts */}
          {node.type === 'user' && (
            <Box
            sx={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onConnectionStart) {
                onConnectionStart(node.id);
              }
            }}
          >
            <CircleIcon
              sx={{
                fontSize: 16,
                color: 'primary.main',
                bgcolor: 'background.paper',
                borderRadius: '50%',
                '&:hover': {
                  fontSize: 20,
                },
              }}
            />
          </Box>
          )}
        </Paper>
      </Rnd>

      <PromptNodeDialog
        open={dialogOpen}
        node={node}
        onClose={() => setDialogOpen(false)}
        onSave={onUpdate}
      />
    </>
  );
}
