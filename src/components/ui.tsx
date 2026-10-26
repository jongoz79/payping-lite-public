import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? theme.textSecondary} />;
}

export function Screen({
  title,
  children,
  action,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}) {
  const theme = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const stackHeader = action !== undefined && (fontScale >= 1.6 || width < 360);
  const content = (
    <View style={[styles.content, contentStyle]}>
      {title !== undefined && (
        <View
          style={[
            styles.header,
            stackHeader && styles.headerStacked,
            contentStyle?.paddingHorizontal === 0 && styles.headerInset,
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, stackHeader && styles.titleStacked, { color: theme.text }]}
          >
            {title}
          </Text>
          <View style={stackHeader && styles.headerAction}>{action}</View>
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} /> : undefined
          }
          contentContainerStyle={styles.scrollContent}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View
        style={[styles.sectionBody, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      >
        {children}
      </View>
    </View>
  );
}

export function AppButton({
  label,
  accessibilityLabel,
  testID,
  onPress,
  icon,
  variant = 'secondary',
  disabled,
  large,
  style,
}: {
  label: string;
  accessibilityLabel?: string;
  testID?: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'accent' | 'secondary' | 'danger' | 'text';
  disabled?: boolean;
  large?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const backgroundColor =
    variant === 'accent' ? theme.accentPrimary : variant === 'primary' ? theme.ink : theme.backgroundElement;
  const color =
    variant === 'accent'
      ? theme.accentInk
      : variant === 'primary'
        ? theme.canvas
        : variant === 'danger'
          ? theme.danger
          : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        large && styles.buttonLarge,
        {
          backgroundColor: variant === 'text' ? 'transparent' : backgroundColor,
          borderColor: ['primary', 'accent', 'text'].includes(variant) ? 'transparent' : theme.border,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon && <Icon name={icon} size={22} color={disabled ? theme.textTertiary : color} />}
      <Text style={[styles.buttonLabel, { color: disabled ? theme.textTertiary : color }]}>{label}</Text>
    </Pressable>
  );
}

export function AppInput({ label, style, multiline, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: theme.text }]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={theme.textTertiary}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          style,
        ]}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.textSecondary : theme.border,
        },
      ]}
    >
      <Text style={[styles.chipLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function SettingsRow({
  icon,
  title,
  description,
  value,
  onPress,
  right,
  danger,
}: {
  icon: IconName;
  title: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, { borderColor: theme.border }, pressed && styles.pressed]}
    >
      <Icon name={icon} color={danger ? theme.danger : theme.textSecondary} />
      <View style={styles.settingsText}>
        <Text style={[styles.rowTitle, { color: danger ? theme.danger : theme.text }]}>{title}</Text>
        {description && (
          <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
        )}
      </View>
      {value && <Text style={[styles.value, { color: theme.textSecondary }]}>{value}</Text>}
      {right ?? (onPress ? <Icon name="chevron-right" /> : null)}
    </Pressable>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>{body}</Text>
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={theme.moneyIn} size="large" />
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: MaxContentWidth, padding: 16, paddingTop: 4, gap: 20, flex: 1 },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    flexWrap: 'wrap',
  },
  headerStacked: { flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap' },
  headerAction: { alignSelf: 'stretch', width: '100%' },
  headerInset: { paddingHorizontal: 16 },
  title: { flex: 1, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.24 },
  titleStacked: { flex: 0, width: '100%' },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.96,
  },
  sectionBody: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  button: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLarge: { minHeight: 56 },
  buttonLabel: { fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.7 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Manrope',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  multiline: { minHeight: 140, textAlignVertical: 'top', fontFamily: 'monospace' },
  chip: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  settingsRow: {
    minHeight: 64,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsText: { flex: 1, flexBasis: 180, gap: 4 },
  rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  description: { fontSize: 12, lineHeight: 17 },
  value: { fontSize: 12, lineHeight: 17, maxWidth: '40%', textAlign: 'right', flexShrink: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, minHeight: 180 },
  emptyTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
});
