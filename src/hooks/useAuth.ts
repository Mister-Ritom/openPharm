import { useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const doc = await firestore().collection('users').doc(user.uid).get();
        if (doc.exists) {
          setProfile(doc.data());
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setInitializing(false);
    });
    return subscriber;
  }, []);

  return { user, profile, initializing };
}
