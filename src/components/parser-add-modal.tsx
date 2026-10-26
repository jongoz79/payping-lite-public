import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { importParserDocument, ParserImportPanel } from '@/components/parser-import';
import type { ParserImportOutcome } from '@/components/parser-import';
import { appLabel, ParserErrors } from '@/components/parser-shared';
import { AppButton, EmptyState, Icon } from '@/components/ui';
import type { CaptureRow, SelectedAppRow } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import type { Parser } from '@/parser/engine';

type AddView = 'choices' | 'paste' | 'create';

export function ParserAddModal({
  visible,
  captures,
  selectedApps,
  onClose,
  onImported,
  onCreate,
}: {
  visible: boolean;
  captures: CaptureRow[];
  selectedApps: SelectedAppRow[];
  onClose: () => void;
  onImported: (parser: Parser) => void;
  onCreate: (capture: CaptureRow) => void;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const [view, setView] = useState<AddView>('choices');
  const [busy, setBusy] = useState(false);
  const [errorTitle, setErrorTitle] = useState<TranslationKey | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const close = () => {
    setView('choices');
    setErrorTitle(null);
    setErrors([]);
    onClose();
  };

  const imported = (parser: Parser) => {
    onImported(parser);
    close();
  };

  const showOutcome = (outcome: ParserImportOutcome) => {
    if (outcome.status === 'success') imported(outcome.parser);
    if (outcome.status === 'error') {
      setErrorTitle(outcome.title);
      setErrors(outcome.errors);
    }
  };

  const openFile = async () => {
    if (busy) return;
    setBusy(true);
    setErrorTitle(null);
    setErrors([]);
    const outcome = await importParserDocument();
    setBusy(false);
    showOutcome(outcome);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderColor: theme.border }]}>
            {view === 'choices' ? (
              <View style={styles.headerSpacer} />
            ) : (
              <AppButton
                label={t('common.back')}
                icon="chevron-left"
                variant="text"
                onPress={() => setView('choices')}
              />
            )}
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
              {view === 'choices'
                ? t('parsers.add')
                : view === 'paste'
                  ? t('parsers.pasteJson')
                  : t('parsers.createFromNotification')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={close}
              style={styles.close}
            >
              <Icon name="close" color={theme.text} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {view === 'choices' && (
              <View style={styles.choices}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('parsers.pasteJson')}
                  onPress={() => setView('paste')}
                  style={[styles.choice, { borderColor: theme.border }]}
                >
                  <Icon name="content-paste" />
                  <Text style={[styles.choiceText, { color: theme.text }]}>{t('parsers.pasteJson')}</Text>
                  <Icon name="chevron-right" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('parsers.openFile')}
                  onPress={() => void openFile()}
                  style={[styles.choice, { borderColor: theme.border }]}
                >
                  <Icon name="file-code-outline" />
                  <Text style={[styles.choiceText, { color: theme.text }]}>{t('parsers.openFile')}</Text>
                  <Icon name="chevron-right" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('parsers.createFromNotification')}
                  onPress={() => setView('create')}
                  style={[styles.choice, { borderColor: theme.border }]}
                >
                  <Icon name="bell-plus-outline" />
                  <Text style={[styles.choiceText, { color: theme.text }]}>
                    {t('parsers.createFromNotification')}
                  </Text>
                  <Icon name="chevron-right" />
                </Pressable>
                {busy && (
                  <Text style={[styles.status, { color: theme.textSecondary }]}>{t('common.loading')}</Text>
                )}
                <ParserErrors title={errorTitle ? t(errorTitle) : undefined} errors={errors} />
              </View>
            )}
            {view === 'paste' && <ParserImportPanel onImported={imported} />}
            {view === 'create' && (
              <View style={styles.captureList}>
                {captures.length === 0 ? (
                  <EmptyState icon="bell-off-outline" title={t('noPaymentsYet')} body={t('noPaymentsBody')} />
                ) : (
                  captures.slice(0, 30).map((capture) => (
                    <Pressable
                      key={capture.id}
                      accessibilityRole="button"
                      onPress={() => {
                        close();
                        onCreate(capture);
                      }}
                      style={({ pressed }) => [
                        styles.capture,
                        { borderColor: theme.border },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.captureTitle, { color: theme.text }]}>
                        {capture.title || appLabel(capture.source_app, selectedApps)}
                      </Text>
                      <Text style={[styles.captureBody, { color: theme.textSecondary }]}>{capture.body}</Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: { width: 48 },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  close: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choices: { paddingBottom: 16 },
  choice: {
    minHeight: 64,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  choiceText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  status: { padding: 16, fontSize: 16, lineHeight: 22 },
  captureList: { paddingHorizontal: 16, paddingBottom: 16 },
  capture: {
    minHeight: 64,
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  captureTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  captureBody: { fontSize: 16, lineHeight: 22 },
  pressed: { opacity: 0.65 },
});
