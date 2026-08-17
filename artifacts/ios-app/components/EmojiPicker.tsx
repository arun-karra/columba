import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';
import {
  EMOJI_CATEGORIES,
  GROUP_ICON_STYLE_COLORS,
  emojisForCategory,
  normalizeEmoji,
  searchEmojis,
  type GroupIconStyleColor,
} from '@/utils/emojiCatalog';
import { getRecentEmojis, rememberRecentEmoji } from '@/utils/groupIconStyle';

type Tab = 'emoji' | 'style';

export type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  /** Full iMessage-style layout for modals; compact for inline cards. */
  variant?: 'sheet' | 'compact';
};

const PREVIEW_SIZE_SHEET = 112;
const PREVIEW_SIZE_COMPACT = 72;
const GRID_COLUMNS = 8;

export function EmojiPicker({
  value,
  onChange,
  backgroundColor,
  onBackgroundColorChange,
  variant = 'sheet',
}: EmojiPickerProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('emoji');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  const normalizedValue = normalizeEmoji(value);
  const previewSize = variant === 'sheet' ? PREVIEW_SIZE_SHEET : PREVIEW_SIZE_COMPACT;
  const cellSize = Math.floor((width - 32) / GRID_COLUMNS);

  useEffect(() => {
    void getRecentEmojis().then(setRecentEmojis);
  }, []);

  const displayedEmojis = useMemo(() => {
    if (query.trim()) {
      return searchEmojis(query, recentEmojis);
    }
    if (categoryId === 'recent' && recentEmojis.length === 0) {
      return emojisForCategory('smileys', recentEmojis);
    }
    return emojisForCategory(categoryId, recentEmojis);
  }, [categoryId, query, recentEmojis]);

  const pickEmoji = useCallback(
    (emoji: string) => {
      const next = normalizeEmoji(emoji);
      if (!next) return;
      Haptics.selectionAsync();
      onChange(next);
      void rememberRecentEmoji(next).then(() => getRecentEmojis().then(setRecentEmojis));
    },
    [onChange],
  );

  const pickStyle = useCallback(
    (color: GroupIconStyleColor) => {
      if (!onBackgroundColorChange) return;
      Haptics.selectionAsync();
      onBackgroundColorChange(color);
    },
    [onBackgroundColorChange],
  );

  const previewBackground =
    backgroundColor ?? colors.secondary;

  const renderEmojiCell = useCallback(
    ({ item }: { item: string }) => {
      const selected = normalizedValue === normalizeEmoji(item);
      return (
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => pickEmoji(item)}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`Select ${item}`}
          style={[
            styles.emojiCell,
            {
              width: cellSize,
              height: cellSize,
              backgroundColor: selected ? colors.secondary : 'transparent',
            },
          ]}
        >
          <Text style={styles.emojiText} allowFontScaling={false}>
            {item}
          </Text>
        </TouchableOpacity>
      );
    },
    [cellSize, colors.secondary, normalizedValue, pickEmoji],
  );

  const renderStyleCell = useCallback(
    ({ item }: { item: GroupIconStyleColor }) => {
      const selected = backgroundColor === item;
      return (
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => pickStyle(item)}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel="Select icon color"
          style={[
            styles.styleCell,
            {
              width: cellSize,
              height: cellSize,
              borderColor: selected ? colors.foreground : 'transparent',
            },
          ]}
        >
          <View style={[styles.styleSwatch, { backgroundColor: item }]}>
            {normalizedValue ? (
              <Text style={styles.styleEmoji} allowFontScaling={false}>
                {normalizedValue}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [backgroundColor, cellSize, colors.foreground, normalizedValue, pickStyle],
  );

  const categories = useMemo(
    () => [
      { id: 'recent', tabIcon: '🕐', label: 'Recent' },
      ...EMOJI_CATEGORIES.map((category) => ({
        id: category.id,
        tabIcon: category.tabIcon,
        label: category.label,
      })),
    ],
    [],
  );

  return (
    <View style={[styles.root, variant === 'sheet' && styles.rootSheet]}>
      <View style={styles.previewWrap}>
        <View
          style={[
            styles.previewCircle,
            {
              width: previewSize,
              height: previewSize,
              borderRadius: previewSize / 2,
              backgroundColor: previewBackground,
            },
          ]}
        >
          {normalizedValue ? (
            <Text
              style={[
                styles.previewEmoji,
                { fontSize: previewSize * 0.46, lineHeight: previewSize * 0.52 },
              ]}
              allowFontScaling={false}
            >
              {normalizedValue}
            </Text>
          ) : (
            <AppIcon name="face.smiling" size={previewSize * 0.34} color={colors.mutedForeground} />
          )}
        </View>
      </View>

      <View style={[styles.segment, { backgroundColor: colors.muted }]}>
        {(['emoji', 'style'] as const).map((segment) => {
          const selected = tab === segment;
          return (
            <Pressable
              key={segment}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(segment);
              }}
              style={[
                styles.segmentBtn,
                selected && { backgroundColor: colors.card },
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: selected ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {segment === 'emoji' ? 'Emoji' : 'Style'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'emoji' ? (
        <>
          <View style={[styles.searchWrap, { backgroundColor: colors.muted }]}>
            <AppIcon name="magnifyingglass" size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search Emoji"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={displayedEmojis}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={GRID_COLUMNS}
            renderItem={renderEmojiCell}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            style={styles.gridList}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No emojis match your search
                </Text>
              </View>
            }
          />

          {!query.trim() ? (
            <View style={[styles.categoryBar, { borderTopColor: colors.border }]}>
              {categories.map((category) => {
                const selected = categoryId === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategoryId(category.id);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.categoryBtn,
                      selected && { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Text style={styles.categoryIcon} allowFontScaling={false}>
                      {category.tabIcon}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  Keyboard.dismiss();
                  setQuery('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={styles.categoryBtn}
              >
                <AppIcon name="delete.left" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      ) : (
        <FlatList
          data={[...GROUP_ICON_STYLE_COLORS]}
          keyExtractor={(item) => item}
          numColumns={GRID_COLUMNS}
          renderItem={renderStyleCell}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.gridList}
          contentContainerStyle={styles.gridContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  rootSheet: { flex: 1 },
  previewWrap: { alignItems: 'center', paddingTop: 4, paddingBottom: 2 },
  previewCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: { textAlign: 'center' },
  segment: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 2,
  },
  segmentBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginHorizontal: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 0,
  },
  gridList: { flex: 1 },
  gridContent: { paddingBottom: 8 },
  emojiCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emojiText: { fontSize: 28, lineHeight: 32 },
  styleCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
  },
  styleSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleEmoji: { fontSize: 22, lineHeight: 26 },
  categoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 2,
  },
  categoryBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: { fontSize: 18, lineHeight: 22 },
  emptyWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
  },
});
