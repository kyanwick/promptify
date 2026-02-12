'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import {
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  Send as SubmitIcon,
} from '@mui/icons-material';
import type { Node } from './types';

interface PromptPreviewProps {
  nodes: Node[];
}

const PromptPreview: React.FC<PromptPreviewProps> = ({ nodes }) => {
  // Get only user-facing prompts (exclude system messages)
  const userPrompts = nodes.filter((node) => node.type === 'user');
  
  // State to track user responses
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const handleResponseChange = (nodeId: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [nodeId]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < userPrompts.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log('User responses:', responses);
    // TODO: Submit responses
  };

  if (userPrompts.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 4,
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No user prompts to preview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Add some user prompt nodes to see the preview
          </Typography>
        </Paper>
      </Box>
    );
  }

  const currentPrompt = userPrompts[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === userPrompts.length - 1;
  const progress = ((currentStep + 1) / userPrompts.length) * 100;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: { xs: 2, sm: 4 },
        bgcolor: 'background.default',
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 4 },
          maxWidth: 700,
          width: '100%',
          position: 'relative',
        }}
        elevation={3}
      >
        {/* Progress bar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            bgcolor: 'grey.200',
            borderRadius: '4px 4px 0 0',
          }}
        >
          <Box
            sx={{
              height: '100%',
              bgcolor: 'primary.main',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
              borderRadius: '4px 0 0 0',
            }}
          />
        </Box>

        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Step indicator */}
          <Typography variant="caption" color="text.secondary">
            Question {currentStep + 1} of {userPrompts.length}
          </Typography>

          {/* Current prompt */}
          <Box>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              {currentPrompt.content || currentPrompt.title}
            </Typography>
          </Box>

          {/* Input field */}
          <TextField
            fullWidth
            multiline
            minRows={4}
            placeholder="Type your answer here..."
            value={responses[currentPrompt.id] || ''}
            onChange={(e) => handleResponseChange(currentPrompt.id, e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1rem',
              },
            }}
          />

          <Divider />

          {/* Navigation buttons */}
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={handleBack}
              disabled={isFirstStep}
              sx={{ minWidth: 120 }}
            >
              Back
            </Button>

            {isLastStep ? (
              <Button
                variant="contained"
                endIcon={<SubmitIcon />}
                onClick={handleSubmit}
                sx={{ minWidth: 120 }}
              >
                Submit
              </Button>
            ) : (
              <Button
                variant="contained"
                endIcon={<NextIcon />}
                onClick={handleNext}
                sx={{ minWidth: 120 }}
              >
                Next
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default PromptPreview;
