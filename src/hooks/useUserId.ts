import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUserId = async () => {
      try {
        const supabase = createClient();

        // First check localStorage
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          setLoading(false);
          return;
        }

        // If not in localStorage, get from Supabase session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          setUserId(user.id);
          // Store it for future use
          localStorage.setItem('userId', user.id);
        } else {
          setUserId(null);
        }
      } catch (error) {
        console.error('Error initializing userId:', error);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    initializeUserId();
  }, []);

  return { userId, loading };
}
