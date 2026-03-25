import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      setIsAuth(!!token);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuth === null) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuth && !inAuthGroup) {
      // Redirect to login if NOT authenticated and NOT in auth group
      router.replace('/(auth)/login');
    } else if (isAuth && inAuthGroup) {
      // Redirect to dashboard if authenticated and in auth group
      router.replace('/(tabs)');
    }
  }, [isAuth, segments]);

  return (
    <Stack>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
