import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { useAuth } from './useAuth';
import { startOfDay } from 'date-fns';

export function useScanCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }

    const db = getFirestore(getApp());
    const todayStart = startOfDay(new Date());

    const q = query(
      collection(db, 'users', user.uid, 'scans'),
      where('timestamp', '>=', todayStart)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCount(snapshot.size);
      setLoading(false);
    }, (err) => {
      console.error('[useScanCount] Error:', err);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { count, loading };
}
