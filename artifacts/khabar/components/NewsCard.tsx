import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";

const { width } = Dimensions.get("window");

interface Article {
  id: string;
  title: string;
  summary: string;
  imageUrl?: string | null;
  sourceName: string;
  category: string;
  publishedAt: string;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

interface NewsCardProps {
  article: Article;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onShare: (article: Article) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  technology: "#4A9EFF",
  business: "#34C759",
  science: "#AF52DE",
  world: "#FF9F0A",
  india: "#FF6B35",
  general: "#9A9A9A",
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NewsCard({ article, onLike, onSave, onShare }: NewsCardProps) {
  const [liked, setLiked] = useState(article.isLiked);
  const [likesCount, setLikesCount] = useState(article.likesCount);
  const [saved, setSaved] = useState(article.isSaved);
  const catColor = CATEGORY_COLORS[article.category] || Colors.textSecondary;

  function handleLike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    onLike(article.id);
  }

  function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved(!saved);
    onSave(article.id);
  }

  function handlePress() {
    router.push({ pathname: "/article/[id]", params: { id: article.id } });
  }

  function handleComment() {
    router.push({ pathname: "/comments/[id]", params: { id: article.id } });
  }

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + "20", borderColor: catColor + "40" }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>{article.category}</Text>
        </View>
        <Text style={styles.source}>{article.sourceName}</Text>
        <Text style={styles.time}>{formatTime(article.publishedAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={3}>{article.title}</Text>

      {article.imageUrl ? (
        <Image source={{ uri: article.imageUrl }} style={styles.image} contentFit="cover"
          transition={300} />
      ) : null}

      <Text style={styles.summary} numberOfLines={article.imageUrl ? 2 : 4}>{article.summary}</Text>

      <View style={styles.actions}>
        <Pressable onPress={handleLike} style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.actionCount, liked && { color: Colors.primary }]}>{likesCount > 0 ? likesCount : ""}</Text>
        </Pressable>

        <Pressable onPress={handleComment} style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.actionCount}>{article.commentsCount > 0 ? article.commentsCount : ""}</Text>
        </Pressable>

        <Pressable onPress={() => onShare(article)} style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
          <Ionicons name="paper-plane-outline" size={20} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.flex} />

        <Pressable onPress={handleSave} style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
          <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={20} color={saved ? Colors.accentBlue : Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.divider} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.background, paddingHorizontal: 16, paddingTop: 16 },
  cardPressed: { opacity: 0.9 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  categoryText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  source: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium", flex: 1 },
  time: { fontSize: 12, color: Colors.textTertiary, fontFamily: "Inter_400Regular" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, lineHeight: 24, marginBottom: 10 },
  image: { width: "100%", height: 200, borderRadius: 12, marginBottom: 10 },
  summary: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 12 },
  actions: { flexDirection: "row", alignItems: "center", paddingBottom: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 8 },
  actionBtnPressed: { opacity: 0.6 },
  actionCount: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  flex: { flex: 1 },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder },
});
