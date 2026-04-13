import { Capacitor } from '@capacitor/core';

interface RemoteConfigValues {
  puzzle_max_iterations: number;
  puzzle_quality_threshold: number;
  show_practice_mode: boolean;
  announcement_text: string;
}

const DEFAULTS: RemoteConfigValues = {
  puzzle_max_iterations: 20000,
  puzzle_quality_threshold: 50,
  show_practice_mode: true,
  announcement_text: '',
};

let cachedValues: RemoteConfigValues = { ...DEFAULTS };
let initialized = false;

export async function fetchRemoteConfig(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    initialized = true;
    return;
  }

  try {
    const { FirebaseRemoteConfig } = await import('@capacitor-firebase/remote-config');

    await FirebaseRemoteConfig.setMinimumFetchInterval({ minimumFetchIntervalInSeconds: 3600 });
    await FirebaseRemoteConfig.fetchAndActivate();

    const getStr = async (key: string) => {
      const { value } = await FirebaseRemoteConfig.getString({ key });
      return value;
    };

    const iterVal = await getStr('puzzle_max_iterations');
    if (iterVal) cachedValues.puzzle_max_iterations = parseInt(iterVal, 10) || DEFAULTS.puzzle_max_iterations;

    const threshVal = await getStr('puzzle_quality_threshold');
    if (threshVal) cachedValues.puzzle_quality_threshold = parseInt(threshVal, 10) || DEFAULTS.puzzle_quality_threshold;

    const practiceVal = await getStr('show_practice_mode');
    if (practiceVal) cachedValues.show_practice_mode = practiceVal === 'true';

    const announcementVal = await getStr('announcement_text');
    if (announcementVal) cachedValues.announcement_text = announcementVal;

    initialized = true;
  } catch {
    initialized = true;
  }
}

export function getRemoteConfig(): RemoteConfigValues {
  return cachedValues;
}

export function isRemoteConfigReady(): boolean {
  return initialized;
}
