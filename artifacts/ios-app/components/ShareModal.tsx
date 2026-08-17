import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenGutter } from '@/constants/layout';
import { ShareGroupPicker } from '@/components/ShareGroupPicker';

interface ShareModalProps {
  visible: boolean;
  selectedGroupId?: string | null;
  onClose: () => void;
  onSelect: (groupId: string, groupName?: string) => void;
}

/** Sheet wrapper for quick group pick (home swipe, etc.). */
export function ShareModal({ visible, selectedGroupId, onClose, onSelect }: ShareModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 12,
              paddingHorizontal: gutter,
              borderBottomColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <Pressable onPress={onClose} hitSlop={14}>
            <Text style={[styles.headerAction, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Select Group</Text>
          <View style={{ width: 64 }} />
        </View>

        <View
          style={[
            styles.body,
            {
              paddingHorizontal: gutter,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <ShareGroupPicker
            showTitle={false}
            selectedGroupId={selectedGroupId}
            onSelect={(id, name) => onSelect(id, name)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: { fontSize: 17, width: 64 },
  headerTitle: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
  body: { flex: 1, paddingTop: 20 },
});
