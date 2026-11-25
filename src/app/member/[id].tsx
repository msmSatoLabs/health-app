import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Avatar, Card, Divider, ErrorNote, IconBubble, ListRow, Loading, Row, Screen, Section, Text } from '../../components/ui';
import { getActivityTypes, getMemberProfile } from '../../lib/api';
import { formatAmount } from '../../lib/activityUi';
import { useUserId } from '../../lib/auth';
import { shortDate } from '../../lib/dates';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

/** A community mate's profile. Hidden items (their privacy settings) come back empty from the database. */
export default function MemberScreen() {
  const { c } = useTheme();
  const userId = useUserId();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, refresh, refreshing } = useLoad(async () => {
    const [member, types] = await Promise.all([getMemberProfile(id), getActivityTypes()]);
    return { member, types };
  });

  if (!data) {
    return (
      <Screen topInset={false}>
        <ErrorNote message={error} />
        {!error ? <Loading /> : null}
      </Screen>
    );
  }

  const { member, types } = data;
  const isMe = member.user_id === userId;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} topInset={false}>
      <Stack.Screen options={{ title: '' }} />
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={member.display_name} url={member.avatar_url} size={96} />
        <Text variant="title" style={{ textAlign: 'center' }}>
          {isMe ? `${member.display_name} (you)` : member.display_name}
        </Text>
      </View>

      <Row style={{ gap: 10 }}>
        <Stat value={member.week_points.toLocaleString()} label="Last 7 days" />
        <Stat value={member.season_points.toLocaleString()} label="This season" />
        <Stat value={member.streak === null ? '–' : String(member.streak)} label="Day streak" />
      </Row>

      <Section title="This week" />
      <Card style={{ gap: 12 }}>
        {member.activities.length === 0 ? (
          <Text variant="body" color={c.muted}>
            Nothing to show this week.
          </Text>
        ) : (
          member.activities.map((a, i) => {
            const t = types.find((x) => x.key === a.activity_key);
            return (
              <View key={a.activity_key} style={{ gap: 12 }}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  left={<IconBubble name={t?.icon ?? 'star'} tone="accent" />}
                  title={t?.label ?? a.activity_key}
                  subtitle={formatAmount(Number(a.amount), t?.unit ?? '')}
                  right={
                    <Text variant="heading" color={c.accent}>
                      +{a.points}
                    </Text>
                  }
                />
              </View>
            );
          })
        )}
      </Card>

      <Section title="Achievements" />
      {member.achievements === null ? (
        <Row>
          <Icon name="lock" size={18} color={c.muted} />
          <Text variant="body" color={c.muted}>
            {isMe ? "You've hidden your achievements." : `${member.display_name} keeps achievements private.`}
          </Text>
        </Row>
      ) : member.achievements.length === 0 ? (
        <Text variant="body" color={c.muted}>
          No achievements yet.
        </Text>
      ) : (
        <Card style={{ gap: 12 }}>
          {member.achievements.map((a, i) => (
            <View key={a.key} style={{ gap: 12 }}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                left={<IconBubble name={a.icon} tone="accent" />}
                title={a.title}
                subtitle={`${a.times > 1 ? `${a.times}× · last ` : ''}${shortDate(a.last_earned)}`}
              />
            </View>
          ))}
        </Card>
      )}
      {member.streak === null ? (
        <Text variant="caption">{isMe ? 'Your streak is hidden from friends.' : 'Streak is private.'}</Text>
      ) : null}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, gap: 2, padding: 14, alignItems: 'center' }}>
      <Text variant="number">{value}</Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}
