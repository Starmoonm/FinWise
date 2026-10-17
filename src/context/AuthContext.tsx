import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  emailVerified: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  sendPasswordlessLink: (email: string) => Promise<void>;
  changeUserEmail: (newEmail: string) => Promise<void>;
  changeUserPassword: (newPass: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('fw_guest_mode') === 'true';
  });

  const emailVerified = Boolean(user?.emailVerified || user?.providerData?.some(p => p.providerId === 'google.com'));

  useEffect(() => {
    // Set persistent local session on phone & laptop
    setPersistence(auth, browserLocalPersistence).catch(console.warn);

    // Check passwordless email link
    if (typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem('fw_email_for_signin');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation') || '';
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(result => {
            localStorage.removeItem('fw_email_for_signin');
            if (result.user) {
              setUser(result.user);
              setIsGuest(false);
            }
          })
          .catch(console.error);
      }
    }

    // Check redirect result (for phone browsers & PWA where popup was redirected)
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          setUser(result.user);
          setIsGuest(false);
          localStorage.removeItem('fw_guest_mode');
        }
      })
      .catch(console.warn);

    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        localStorage.removeItem('fw_guest_mode');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      setIsGuest(false);
      localStorage.removeItem('fw_guest_mode');
    } catch (err: any) {
      console.warn('Popup sign-in error, trying redirect fallback for mobile:', err);
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      ) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      setUser(cred.user);
      setIsGuest(false);
      localStorage.removeItem('fw_guest_mode');
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await sendEmailVerification(cred.user);
      setUser(cred.user);
      setIsGuest(false);
      localStorage.removeItem('fw_guest_mode');
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
  };

  const sendPasswordlessLink = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
    localStorage.setItem('fw_email_for_signin', email.trim());
  };

  const changeUserEmail = async (newEmail: string) => {
    if (auth.currentUser) {
      await updateEmail(auth.currentUser, newEmail.trim());
      await reloadUser();
    }
  };

  const changeUserPassword = async (newPass: string) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPass);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem('fw_guest_mode');
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('fw_guest_mode', 'true');
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        emailVerified,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        sendVerificationEmail,
        reloadUser,
        sendPasswordlessLink,
        changeUserEmail,
        changeUserPassword,
        signOutUser,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
