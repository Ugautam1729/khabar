import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator,
  Pressable, StatusBar, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import NewsCard from "@/components/NewsCard";
import CategoryBar from "@/components/CategoryBar";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["feed", category],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "20" });
      if (category !== "all") params.set("category", category);
      const res = await fetch(`${BASE_URL}/api/news/feed?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load feed");
      const json = await res.json();
      setAllArticles(json.articles || []);
      setPage(1);
      return json;
    },
    enabled: !!token,
  });

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleLoadMore() {
    if (loadingMore || !data?.hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams({ page: String(nextPage), limit: "20" });
      if (category !== "all") params.set("category", category);
      const res = await fetch(`${BASE_URL}/api/news/feed?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setAllArticles((prev) => [...prev, ...(json.articles || [])]);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleLike(id: string) {
    await fetch(`${BASE_URL}/api/news/${id}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function handleSave(id: string) {
    await fetch(`${BASE_URL}/api/news/${id}/save`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    queryClient.invalidateQueries({ queryKey: ["saved"] });
  }

  function handleShare(article: Article) {
    router.push({ pathname: "/share", params: { articleId: article.id } });
  }

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    setAllArticles([]);
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Khabar</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/notifications")} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      <CategoryBar selected={category} onSelect={handleCategoryChange} />

      {isLoading && allArticles.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Couldn't load news</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : allArticles.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="newspaper-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No news yet</Text>
          <Text style={styles.emptySubtext}>Pull down to refresh</Text>
        </View>
      ) : (
        <FlatList
          data={allArticles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NewsCard article={item} onLike={handleLike} onSave={handleSave} onShare={handleShare} />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
              tintColor={Colors.primary} colors={[Colors.primary]} />
          }
          ListFooterComponent={loadingMore ? (
            <View style={styles.footer}><ActivityIndicator color={Colors.primary} /></View>
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, flex: 1, letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtext: { fontSize: 14, color: Colors.textTertiary, fontFamily: "Inter_400Regular" },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  retryText: { color: Colors.white, fontFamily: "Inter_600SemiBold" },
  footer: { padding: 20, alignItems: "center" },
});
