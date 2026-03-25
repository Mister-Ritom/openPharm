import { useState, useEffect } from 'react';
import { FirebaseAuthTypes, getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirestore, onSnapshot, doc } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const app = getApp();
    const authInstance = getAuth(app);
    const db = getFirestore(app);
    let profileUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(authInstance, (user) => {
      setUser(user);
      
      // Clean up previous profile listener if any
      profileUnsubscribe?.();

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        profileUnsubscribe = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          } else {
            setProfile(null);
          }
          setInitializing(false);
        }, (err) => {
          console.error('Profile snapshot error:', err);
          setInitializing(false);
        });
      } else {
        setProfile(null);
        setInitializing(false);
      }
    });

    return () => {
      authUnsubscribe();
      profileUnsubscribe?.();
    };
  }, []);

  return { user, profile, initializing };
}
