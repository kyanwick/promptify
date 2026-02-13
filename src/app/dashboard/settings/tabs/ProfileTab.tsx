'use client';

import {
  Box,
  Card,
  TextField,
  Button,
  Stack,
  Typography,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { UserProfileService } from '@/services/userProfileService';
import { useUserId } from '@/hooks/useUserId';

interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
}

export default function ProfileTab() {
  const { userId, loading: userIdLoading } = useUserId();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const profileService = new UserProfileService();

  useEffect(() => {
    if (!userIdLoading && userId) {
      loadProfile();
    }
  }, [userId, userIdLoading]);

  const loadProfile = async () => {
    if (!userId) {
      setError('User not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Try to fetch from Supabase
      try {
        const fetchedProfile = await profileService.getProfile(userId);
        if (fetchedProfile) {
          setProfile({
            id: fetchedProfile.id,
            name: fetchedProfile.name || '',
            avatar: fetchedProfile.avatar || '',
          });
          setName(fetchedProfile.name || '');
          setAvatar(fetchedProfile.avatar || '');
        } else {
          // No profile yet, create default
          setProfile({
            id: userId,
            name: `User ${userId.slice(0, 8)}`,
            avatar: '',
          });
          setName(`User ${userId.slice(0, 8)}`);
        }
      } catch (dbError) {
        // Fallback to localStorage if Supabase fails
        console.warn('Failed to load from Supabase, using fallback:', dbError);
        const savedProfile = localStorage.getItem(`profile_${userId}`);
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setProfile(parsed);
          setName(parsed.name || '');
          setAvatar(parsed.avatar || '');
        } else {
          setProfile({
            id: userId,
            name: `User ${userId.slice(0, 8)}`,
            avatar: '',
          });
          setName(`User ${userId.slice(0, 8)}`);
        }
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      setError('User not found');
      return;
    }

    try {
      setSaving(true);

      const updatedProfile = {
        id: userId,
        name: name.trim() || 'User',
        avatar,
      };

      // Save to Supabase
      try {
        await profileService.saveProfile(userId, updatedProfile.name, avatar || undefined);
      } catch (dbError) {
        // Fallback: save to localStorage
        console.warn('Failed to save to Supabase, using fallback:', dbError);
        localStorage.setItem(`profile_${userId}`, JSON.stringify(updatedProfile));
      }

      // Also save avatar to a global key for easy access by the layout
      if (avatar) {
        localStorage.setItem(`userAvatar_${userId}`, avatar);
      } else {
        localStorage.removeItem(`userAvatar_${userId}`);
      }

      setProfile(updatedProfile);
      setSuccess('Profile updated successfully!');

      // Trigger a storage event to update avatar in real-time
      window.dispatchEvent(new Event('avatarUpdated'));

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update your personal information
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Avatar */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Avatar
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={avatar}
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: '2rem',
                }}
              >
                {name[0]?.toUpperCase()}
              </Avatar>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
              >
                Upload Avatar
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={handleAvatarUpload}
                />
              </Button>
            </Stack>
          </Box>

          {/* Name */}
          <Box>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </Box>

          {/* Save Button */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Stack>
      </Card>
    </Stack>
  );
}
