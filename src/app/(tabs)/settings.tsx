import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Divider,
  ErrorNote,
  IconBubble,
  Input,
  ListRow,
  Loading,
  Row,
  Screen,
  Section,
  Segmented,
  SwitchRow,
  Text,
} from '../../components/ui';
import { RestDayPlanner } from '../../features/rest-days/RestDayPlanner';
import { isDemoHealthEnabled, setDemoHealthEnabled } from '../../health';
import { friendlyError, getActivityTypes, getMyProfile, removeAvatar, updateProfile, uploadAvatar } from '../../lib/api';
import { useAuth, useUserId } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { ProfileUpdate } from '../../lib/types';
import { useLoad } from '../../lib/useLoad';
import { setThemePreference, useThemePreference } from '../../theme/appearance';
import { useTheme } from '../../theme/theme';

/** Everything that changes your profile lives here: photo, name, privacy, appearance. */
export default function Settings() {
  const { c } = useTheme();
  const themePreference = useThemePreference();
  const { session } = useAuth();
  const userId = useUserId();
  const { data, error, reload, refresh, refreshing } = useLoad(async () => {
    const [profile, types] = await Promise.all([getMyProfile(userId), getActivityTypes()]);
    return { profile, types };
  });
  const [name, setName] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    isDemoHealthEnabled().then(setDemo);
  }, []);

  if (!data) {
    return (
      <Screen>
        <Text variant="largeTitle">Settings</Text>
        <ErrorNote message={error} />
        {!error ? <Loading /> : null}
      </Screen>
    );
  }

  const { profile, types } = data;
  // Missing until the 2026-11-26 database script has been run.
  const needsDbUpdate = profile.hidden_activities === undefined || profile.share_streak === undefined;
  const hiddenActivities = profile.hidden_activities ?? [];
  const editedName = name ?? profile.display_name;
  const nameChanged = editedName.trim() !== profile.display_name && editedName.trim().length > 0;

  async function save(patch: ProfileUpdate) {
    setActionError(null);
    try {
      await updateProfile(userId, patch);
      await reload();
    } catch (e) {
      setActionError(friendlyError(e));
    }
  }

  async function saveName() {
    setSaving(true);
    await save({ display_name: editedName.trim() });
    setName(null);
    setSaving(false);
  }

  async function changePhoto() {
    setActionError(null);
    try {
      // Loaded only when needed, so a photo-library problem can't break the page.
      const { pickAvatarJpeg } = await import('../../lib/avatarPicker');
      const jpeg = await pickAvatarJpeg();
      if (!jpeg) return;
      setPhotoBusy(true);
      await uploadAvatar(userId, jpeg);
      await reload();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      setPhotoBusy(false);
    }
  }

  function photoMenu() {
    if (!profile.avatar_url) {
      changePhoto();
      return;
    }
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose a new photo', onPress: changePhoto },
      {
        text: 'Remove photo',
        style: 'destructive',
        onPress: async () => {
          setPhotoBusy(true);
          try {
            await removeAvatar(userId);
            await reload();
          } catch (e) {
            setActionError(friendlyError(e));
          } finally {
            setPhotoBusy(false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function toggleActivity(key: string, visible: boolean) {
    const hidden = new Set(hiddenActivities);
    if (visible) hidden.delete(key);
    else hidden.add(key);
    save({ hidden_activities: [...hidden] });
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Text variant="largeTitle">Settings</Text>
      {needsDbUpdate ? <DbUpdateNote /> : null}

      <Section title="Profile" />
      <Card style={{ gap: 16 }}>
        <Row style={{ gap: 16 }}>
          <Pressable onPress={photoMenu} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <View>
              <Avatar name={profile.display_name} url={profile.avatar_url} size={84} highlight />
              {photoBusy ? (
                <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={c.accent} />
                </View>
              ) : null}
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="heading">{profile.display_name}</Text>
            <Pressable onPress={photoMenu} hitSlop={8} accessibilityRole="button">
              <Text variant="body" color={c.accent}>
                {profile.avatar_url ? 'Change photo' : 'Add a photo'}
              </Text>
            </Pressable>
          </View>
        </Row>
        <Divider />
        <View style={{ gap: 8 }}>
          <Text variant="label">Display name</Text>
          <Input value={editedName} onChangeText={setName} maxLength={40} autoCorrect={false} />
          {nameChanged ? <Button title="Save name" onPress={saveName} loading={saving} /> : null}
        </View>
      </Card>

      <Section title="Privacy" />
      <Text variant="small">
        People in your communities always see your points on the leaderboard. Choose what else they can see when they
        tap your name.
      </Text>
      <Card style={{ gap: 10 }}>
        <SwitchRow
          icon="flame"
          title="Streak"
          value={profile.share_streak ?? true}
          onChange={(v) => save({ share_streak: v })}
        />
        <Divider />
        <SwitchRow
          icon="trophy"
          title="Achievements"
          value={profile.share_achievements ?? true}
          onChange={(v) => save({ share_achievements: v })}
        />
      </Card>
      <Text variant="label" style={{ marginTop: 4 }}>
        Activities friends can see
      </Text>
      <Card style={{ gap: 10 }}>
        {types.map((t, i) => (
          <View key={t.key} style={{ gap: 10 }}>
            {i > 0 ? <Divider /> : null}
            <SwitchRow
              icon={t.icon}
              title={t.label}
              value={!hiddenActivities.includes(t.key)}
              onChange={(v) => toggleActivity(t.key, v)}
            />
          </View>
        ))}
      </Card>
      <Text variant="caption">
        Hidden activities still count toward your points, but friends won’t see them on your profile or in the
        community feed.
      </Text>

      <Section title="Rest days" />
      <RestDayPlanner />

      <Section title="Health data" />
      <Card style={{ gap: 10 }}>
        <ListRow
          left={<IconBubble name="heart" tone="warm" size={36} />}
          title="Apple Health"
          subtitle="Needs the full app build. Not available in Expo Go yet."
        />
        {__DEV__ ? (
          <>
            <Divider />
            <SwitchRow
              icon="sync"
              title="Demo health data"
              subtitle={'Testing only. Fake steps, sleep and workouts for "Sync health".'}
              value={demo}
              onChange={async (v) => {
                setDemo(v);
                await setDemoHealthEnabled(v);
              }}
            />
          </>
        ) : null}
      </Card>

      <Section title="Appearance" />
      <Segmented
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={themePreference}
        onChange={setThemePreference}
      />
      <Text variant="caption">System matches your iPhone’s light or dark setting.</Text>

      <Section title="Account" />
      <Card>
        <ListRow left={<IconBubble name="user" size={36} />} title="Signed in as" subtitle={session?.user.email ?? ''} />
      </Card>

      <ErrorNote message={actionError} />
      <Button title="Sign out" kind="secondary" icon="logout" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

function DbUpdateNote() {
  const { c } = useTheme();
  return (
    <Card style={{ gap: 6, backgroundColor: c.warmSoft, borderColor: c.warmSoft }}>
      <Text variant="heading" color={c.warmInk}>
        Database update needed
      </Text>
      <Text variant="small" color={c.warmInk}>
        Photos and privacy settings need the newest database scripts. On your computer, run npm run db:push in the
        project folder, then pull down here to refresh.
      </Text>
    </Card>
  );
}
