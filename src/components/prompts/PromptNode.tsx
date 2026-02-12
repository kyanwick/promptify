'use client';
import { useState } from 'react';
import { Paper, Stack, TextField, IconButton } from '@mui/material';
import {
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  SmartToy as SmartToyIcon,
  OpenInFull as ExpandIcon,
} from '@mui/icons-material';
import { Rnd } from 'react-rnd';
import { NodeComponentProps } from './types';
import PromptNodeDialog from './PromptNodeDialog';

export default function PromptNode({
  node,
  onUpdate,
  onDelete,
  isMobile,
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
            bgcolor: node.type === 'system' ? 'background.paper' : 'primary.light',
            border: 2,
            borderColor: node.type === 'system' ? 'secondary.main' : 'primary.main',
            touchAction: 'none',
            '&:hover': {
              boxShadow: 6,
            },
          }}
        >
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
                <DescriptionIcon fontSize={isMobile ? 'medium' : 'small'} />
              ) : (
                <SmartToyIcon fontSize={isMobile ? 'medium' : 'small'} />
              )}
              <TextField
                value={node.title}
                onChange={(e) => onUpdate(node.id, { title: e.target.value })}
                variant="standard"
                size="small"
                fullWidth
                inputProps={{
                  style: {
                    fontSize: isMobile ? 14 : 12,
                    fontWeight: 600,
                    padding: 0,
                  },
                }}
                sx={{
                  '& .MuiInput-root': {
                    '&:before': {
                      borderBottom: '1px solid transparent',
                    },
                    '&:hover:not(.Mui-disabled):before': {
                      borderBottom: '1px solid rgba(0, 0, 0, 0.42)',
                    },
                  },
                }}
                onClick={(e) => e.stopPropagation()}
              />
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
                ? 'Enter system message...'
                : 'Enter your AI prompt...'
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
