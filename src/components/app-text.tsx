import { StyleSheet, Text, type TextProps } from 'react-native';

export function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.font, style]} />;
}

const styles = StyleSheet.create({
  font: { fontFamily: 'Manrope' },
});
