import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { getCaptureCount, useCaptureRefresh } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

export default function TabLayout() {
  const { t } = useI18n();
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const [reviewCount, setReviewCount] = useState(0);
  const refresh = useCallback(() => {
    setReviewCount(getCaptureCount({ status: 'needs_review' }));
  }, []);
  useCaptureRefresh(refresh);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: fontScale < 1.6,
        tabBarActiveTintColor: theme.navigationActive,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          minHeight: 72,
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: 3,
          marginVertical: 5,
        },
        tabBarLabelStyle: {
          fontFamily: 'Manrope',
          fontSize: 12,
          lineHeight: 17,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarAccessibilityLabel:
            reviewCount > 0
              ? `${t('tabs.today')}, ${t('needsCheckCount', { count: reviewCount })}`
              : t('tabs.today'),
          tabBarBadge: reviewCount > 0 ? (reviewCount > 99 ? '99+' : reviewCount) : undefined,
          tabBarBadgeStyle: {
            minWidth: 36,
            paddingHorizontal: 5,
            fontSize: 12,
          },
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash-multiple" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarAccessibilityLabel: t('a11y.tab', { label: t('tabs.history') }),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="parsers"
        options={{
          title: t('tabs.parsers'),
          tabBarAccessibilityLabel: t('a11y.tab', { label: t('tabs.parsers') }),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bank-outline" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarAccessibilityLabel: t('a11y.tab', { label: t('tabs.settings') }),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
