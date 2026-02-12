import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import {
  TrendingUp,
  Chat as ChatIcon,
  Assessment,
  Stars,
} from '@mui/icons-material';

const stats = [
  {
    title: 'Total Prompts',
    value: '24',
    icon: <Stars sx={{ fontSize: 40 }} />,
    color: 'primary.main',
  },
  {
    title: 'Conversations',
    value: '12',
    icon: <ChatIcon sx={{ fontSize: 40 }} />,
    color: 'secondary.main',
  },
  {
    title: 'Success Rate',
    value: '94%',
    icon: <Assessment sx={{ fontSize: 40 }} />,
    color: 'success.main',
  },
  {
    title: 'Growth',
    value: '+18%',
    icon: <TrendingUp sx={{ fontSize: 40 }} />,
    color: 'info.main',
  },
];

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
        Welcome Back!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Here's what's happening with your prompts today.
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={600}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<ChatIcon />}>
                New Chat
              </Button>
              <Button variant="outlined" startIcon={<Stars />}>
                Browse Prompts
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Getting Started with MUI
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Your Supabase integration is preserved and ready to use. Start building your
              features with Material UI components!
            </Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="body2">
                ✅ Material UI configured with dark/light mode
              </Typography>
              <Typography variant="body2">
                ✅ Supabase client and server utilities ready
              </Typography>
              <Typography variant="body2">
                ✅ Authentication layout structure in place
              </Typography>
              <Typography variant="body2">
                ✅ Responsive dashboard layout with sidebar
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
