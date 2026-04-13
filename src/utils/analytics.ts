import { Capacitor } from '@capacitor/core';

type EventParams = Record<string, string | number | boolean>;

let FirebaseAnalytics: typeof import('@capacitor-firebase/analytics').FirebaseAnalytics | null = null;

async function getAnalytics() {
  if (FirebaseAnalytics) return FirebaseAnalytics;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor-firebase/analytics');
    FirebaseAnalytics = mod.FirebaseAnalytics;
    return FirebaseAnalytics;
  } catch {
    return null;
  }
}

export async function logEvent(name: string, params?: EventParams) {
  const fa = await getAnalytics();
  if (!fa) return;
  try {
    await fa.logEvent({ name, params: params ?? {} });
  } catch {
    // silently fail — analytics should never break the app
  }
}

export async function setScreen(screenName: string) {
  const fa = await getAnalytics();
  if (!fa) return;
  try {
    await fa.setCurrentScreen({ screenName });
  } catch {
    // no-op
  }
}

export async function setUserId(userId: string | null) {
  const fa = await getAnalytics();
  if (!fa) return;
  try {
    await fa.setUserId({ userId });
  } catch {
    // no-op
  }
}

export async function setUserProperty(key: string, value: string | null) {
  const fa = await getAnalytics();
  if (!fa) return;
  try {
    await fa.setUserProperty({ key, value });
  } catch {
    // no-op
  }
}
