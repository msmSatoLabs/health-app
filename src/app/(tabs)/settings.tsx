import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { Button, Card, IconBubble, Row, Screen, Text } from '../../components/ui';
import { isDemoHealthEnabled, setDemoHealthEnabled } from '../../health';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/theme';

export default function Settings() {
  const { c } = useTheme();
  const { session } = useAuth();
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    isDemoHealthEnabled().then(setDemo);
  }, []);

  return (
    <Screen>
      <Text variant="title">Settings</Text>

      <Text variant="label">Account</Text>
      <Card style={{ gap: 12 }}>
        <Row>
          <IconBubble name="user" size={30} />
          <View style={{ flex: 1 }}>
            <Text variant="body">Signed in as</Text>
            <Text variant="small">{session?.user.email ?? ''}</Text>
          </View>
        </Row>
      </Card>

      <Text variant="label">Health data</Text>
      <Card style={{ gap: 12 }}>
        <Row>
          <IconBubble name="heart" tone="warm" size={30} />
          <View style={{ flex: 1 }}>
            <Text variant="body">Apple Health</Text>
            <Text variant="small">Needs the full app build. Not available in Expo Go yet.</Text>
          </View>
        </Row>
        {__DEV__ ? (
          <Row>
            <IconBubble name="sync" size={30} />
            <View style={{ flex: 1 }}>
              <Text variant="body">Demo health data</Text>
              <Text variant="small">Testing only. Fake steps, sleep and workouts for "Sync health".</Text>
            </View>
            <Switch
              value={demo}
              onValueChange={async (v) => {
                setDemo(v);
                await setDemoHealthEnabled(v);
              }}
              trackColor={{ true: c.accent, false: c.track }}
            />
          </Row>
        ) : null}
      </Card>

      <Button title="Sign out" kind="secondary" icon="logout" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
