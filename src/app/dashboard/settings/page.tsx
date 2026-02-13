'use client';

import {
  Box,
  Card,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  VpnKey as VpnKeyIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { ProfileTab, APIKeysTab, AccountTab } from './tabs';

type TabType = 'profile' | 'api-keys' | 'account';

const TABS: { id: TabType; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'account', label: 'Account' },
];

const getTabIcon = (tabId: TabType) => {
  switch (tabId) {
    case 'profile':
      return <PersonIcon />;
    case 'api-keys':
      return <VpnKeyIcon />;
    case 'account':
      return <SettingsIcon />;
  }
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'api-keys':
        return <APIKeysTab />;
      case 'account':
        return <AccountTab />;
      default:
        return null;
    }
  };

  if (isMobile) {
    return (
      <Box sx={{ py: 2 }}>
        <Card sx={{ mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 64,
              '& .MuiTab-root': {
                minHeight: 64,
              },
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                icon={getTabIcon(tab.id)}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Card>
        <Card sx={{ p: 2 }}>
          {renderTabContent()}
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3, h: '100%' }}>
      <Stack spacing={2} direction="row" sx={{ h: '100%' }}>
        {/* Sidebar */}
        <Card
          sx={{
            width: 280,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            height: 'fit-content',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Settings
            </Typography>
          </Box>
          <Divider />
          <List sx={{ py: 0 }}>
            {TABS.map((tab) => (
              <ListItem key={tab.id} disablePadding>
                <ListItemButton
                  selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    },
                  }}
                >
                  <ListItemIcon>{getTabIcon(tab.id)}</ListItemIcon>
                  <ListItemText primary={tab.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Card>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ p: 3 }}>
            {renderTabContent()}
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
