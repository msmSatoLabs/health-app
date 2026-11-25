import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../theme/theme';

export default function TabsLayout() {
  const { c, font, radius } = useTheme();
  const { session } = useAuth();
  if (!session) return <Redirect href="/sign-in" />;

  const tab = (name: string) =>
    function TabIcon({ color }: { color: unknown }) {
      return <Icon name={name} size={22} color={typeof color === "string" ? color : c.muted} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.tabBg, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 10 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tab('home') }} />
      <Tabs.Screen name="ranks" options={{ title: 'Ranks', tabBarIcon: tab('trophy') }} />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Log activity',
          tabBarIcon: () => (
            <View
              style={{
                width: 46,
                height: 46,
                marginTop: 8,
                borderRadius: radius.pill,
                backgroundColor: c.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="plus" size={24} color={c.onAccent} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: tab('user') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tab('settings') }} />
    </Tabs>
  );
}
