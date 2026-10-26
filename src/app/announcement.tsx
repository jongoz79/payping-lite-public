import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { AppButton, AppInput, Icon, Screen, Section } from '@/components/ui';
import { getTtsTemplates, setSetting, TTS_TEMPLATE_IN_KEY, TTS_TEMPLATE_OUT_KEY } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { speakTest } from '@/native/capture';
import type { ParseResult } from '@/parser/engine';
import { DEFAULT_TTS_TEMPLATE, TTS_TEMPLATE_MAX, ttsText, type TtsTemplates } from '@/parser/tts';

type Direction = 'in' | 'out';
type PresetId = 'short' | 'sentence' | 'amount';

const TOKENS = ['{sign}', '{amount}', '{app}', '{payee}'] as const;
const SAMPLE_APP = 'TNG eWallet';
const SAMPLES: Record<Direction, ParseResult> = {
  in: {
    ruleId: null,
    direction: 'in',
    amountMinor: 1250,
    currency: 'MYR',
    counterparty: 'Ali',
    confidence: 'high',
  },
  out: {
    ruleId: null,
    direction: 'out',
    amountMinor: 800,
    currency: 'MYR',
    counterparty: 'Kedai Pak Mat',
    confidence: 'high',
  },
};

function presets(language: 'en' | 'ms'): Record<PresetId, Required<TtsTemplates>> {
  return {
    short: { in: '', out: '' },
    sentence:
      language === 'ms'
        ? {
            in: 'Terima {amount}[ daripada {payee}][ melalui {app}]',
            out: 'Bayar {amount}[ kepada {payee}][ melalui {app}]',
          }
        : {
            in: 'Received {amount}[ from {payee}][ via {app}]',
            out: 'Paid {amount}[ to {payee}][ via {app}]',
          },
    amount: { in: '{sign} {amount}', out: '{sign} {amount}' },
  };
}

function OptionButton({
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
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.textSecondary : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.optionButtonLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export default function AnnouncementScreen() {
  const theme = useTheme();
  const { t, language } = useI18n();
  const [templates, setTemplates] = useState<Required<TtsTemplates>>({
    in: '',
    out: '',
  });

  useFocusEffect(
    useCallback(() => {
      const stored = getTtsTemplates();
      setTemplates({ in: stored.in ?? '', out: stored.out ?? '' });
    }, []),
  );

  const save = (next: Required<TtsTemplates>) => {
    setTemplates(next);
    try {
      setSetting(TTS_TEMPLATE_IN_KEY, (next.in ?? '').slice(0, TTS_TEMPLATE_MAX));
      setSetting(TTS_TEMPLATE_OUT_KEY, (next.out ?? '').slice(0, TTS_TEMPLATE_MAX));
    } catch {
      Alert.alert(t('errors.saveFailed'));
    }
  };

  const options = presets(language);
  const active = (Object.keys(options) as PresetId[]).find(
    (id) => options[id].in === templates.in && options[id].out === templates.out,
  );
  const speak = (text: string | null) => {
    if (!text) return;
    try {
      speakTest(text);
    } catch {
      Alert.alert(t('errors.voice'));
    }
  };

  const editor = (direction: Direction) => {
    const value = templates[direction] ?? '';
    const sample = SAMPLES[direction];
    const withPayee = ttsText(sample, language, SAMPLE_APP, templates);
    const withoutPayee = ttsText({ ...sample, counterparty: undefined }, language, SAMPLE_APP, templates);
    const label = direction === 'in' ? t('announcement.moneyIn') : t('announcement.moneyOut');
    return (
      <View
        style={[styles.editor, direction === 'out' && [styles.editorDivider, { borderColor: theme.border }]]}
      >
        <AppInput
          label={label}
          value={value}
          placeholder={DEFAULT_TTS_TEMPLATE}
          maxLength={TTS_TEMPLATE_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ backgroundColor: theme.backgroundSelected }}
          onChangeText={(text) => setTemplates((current) => ({ ...current, [direction]: text }))}
          onEndEditing={() => save(templates)}
        />
        <View style={styles.chips}>
          {TOKENS.map((token) => (
            <OptionButton
              key={token}
              label={`+ ${token}`}
              selected={false}
              onPress={() => {
                const spaced = value && !value.endsWith(' ') ? `${value} ${token}` : `${value}${token}`;
                save({ ...templates, [direction]: spaced });
              }}
            />
          ))}
        </View>
        {[withPayee, withoutPayee].map((text, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`${t('announcement.play')}: ${text ?? ''}`}
            onPress={() => speak(text)}
            style={({ pressed }) => [
              styles.preview,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
          >
            <Icon name="volume-high" size={20} />
            <View style={styles.previewText}>
              <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                {index === 0 ? t('announcement.withPayee') : t('announcement.withoutPayee')}
              </Text>
              <Text style={[styles.previewBody, { color: theme.text }]}>“{text}”</Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <Screen
      title={t('announcement.title')}
      action={<AppButton variant="text" label={t('common.back')} onPress={() => router.back()} />}
    >
      <Section title={t('announcement.style')}>
        <View style={styles.padded}>
          <View style={styles.chips}>
            {(Object.keys(options) as PresetId[]).map((id) => (
              <OptionButton
                key={id}
                label={t(`announcement.preset.${id}`)}
                selected={active === id}
                onPress={() => save(options[id])}
              />
            ))}
            <OptionButton
              label={t('announcement.preset.custom')}
              selected={active === undefined}
              onPress={() => {}}
            />
          </View>
        </View>
      </Section>

      <Section title={t('announcement.wording')}>
        <View style={styles.padded}>
          <Text style={[styles.help, { color: theme.textSecondary }]}>{t('announcement.help')}</Text>
          <View style={[styles.helpCard, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.help, { color: theme.textSecondary }]}>
              {`{sign} ${t('announcement.tokenSign')} · {amount} ${t('announcement.tokenAmount')} · {app} ${t('announcement.tokenApp')} · {payee} ${t('announcement.tokenPayee')}`}
            </Text>
            <Text style={[styles.help, { color: theme.textSecondary }]}>{t('announcement.brackets')}</Text>
          </View>
          {editor('in')}
          {editor('out')}
          <AppButton icon="restore" label={t('common.reset')} onPress={() => save(options.short)} />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: {
    minHeight: 48,
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  editor: { gap: 12 },
  editorDivider: {
    marginTop: 4,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  help: { fontSize: 14, lineHeight: 21 },
  helpCard: { gap: 8, borderRadius: 12, padding: 12 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
  },
  previewText: { flex: 1, flexShrink: 1, gap: 4 },
  previewLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  previewBody: { fontSize: 16, lineHeight: 22 },
  pressed: { opacity: 0.65 },
});
