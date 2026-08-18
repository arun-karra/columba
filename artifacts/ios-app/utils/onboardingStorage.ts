import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_SLIDES_KEY = 'columba-onboarding-slides-seen';

export async function hasSeenOnboardingSlides(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_SLIDES_KEY);
  return value === 'true';
}

export async function markOnboardingSlidesSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SLIDES_KEY, 'true');
}
