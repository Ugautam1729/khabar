import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "general", label: "Top News" },
  { key: "technology", label: "Tech" },
  { key: "business", label: "Business" },
  { key: "world", label: "World" },
  { key: "science", label: "Science" },
  { key: "india", label: "India" },
];

interface CategoryBarProps {
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryBar({ selected, onSelect }: CategoryBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={styles.scroll} contentContainerStyle={styles.content}>
      {CATEGORIES.map((cat) => (
        <Pressable key={cat.key}
          style={({ pressed }) => [styles.chip, selected === cat.key && styles.chipActive, pressed && styles.chipPressed]}
          onPress={() => onSelect(cat.key)}>
          <Text style={[styles.chipText, selected === cat.key && styles.chipTextActive]}>{cat.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 0 },
  content: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
});
