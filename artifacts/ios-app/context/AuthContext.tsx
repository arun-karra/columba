import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@workspace/api-client-react';

export const TOKEN_KEY = 'columba-token';
const USER_KEY = 'columba-user';

/**
 * The JWT is kept in the iOS/Android Keychain via SecureStore rather than
 * plain AsyncStorage. SecureStore has no web implementation, so web falls
 * back to AsyncStorage there.
 */
export function getToken(): Promise<string | null> {
  return Platform.OS === 'web' ? AsyncStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY);
}

function setToken(token: string): Promise<void> {
  return Platform.OS === 'web'
    ? AsyncStorage.setItem(TOKEN_KEY, token)
    : SecureStore.setItemAsync(TOKEN_KEY, token);
}

function deleteToken(): Promise<void> {
  return Platform.OS === 'web' ? AsyncStorage.removeItem(TOKEN_KEY) : SecureStore.deleteItemAsync(TOKEN_KEY);
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY)
      .then((stored) => {
        if (stored) setUser(JSON.parse(stored) as User);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (token: string, newUser: User) => {
    await Promise.all([setToken(token), AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser))]);
    setUser(newUser);
  };

  const signOut = async () => {
    await Promise.all([deleteToken(), AsyncStorage.removeItem(USER_KEY)]);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
