import type { HealthSource, HealthTotals } from './types';

/**
 * Apple Health (HealthKit) reader. NOT ACTIVE YET.
 *
 * Expo Go (the app you test with from Windows) cannot read Apple Health,
 * because HealthKit needs native code compiled into the app. To turn this on:
 *   1. Get an Apple Developer account ($99/year).
 *   2. Install a HealthKit library, e.g.
 *        npx expo install @kingstinct/react-native-healthkit react-native-nitro-modules
 *      and add its config plugin to app.json (with the usage descriptions).
 *   3. Build a "development build" in the cloud: npx eas-cli build --profile development --platform ios
 *   4. Fill in the three methods below using that library and set `isAvailable`
 *      to check HealthKit is supported.
 * Until then, `isAvailable()` returns false and the app falls back to manual logging.
 */
export const healthKitSource: HealthSource = {
  name: 'Apple Health',
  async isAvailable() {
    return false;
  },
  async requestPermission() {
    return false;
  },
  async getDailyTotals(_day: string): Promise<HealthTotals> {
    return {};
  },
};
