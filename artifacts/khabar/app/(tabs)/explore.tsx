import React, { useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"news" | "people">("news");
  const [debouncedQ, setDebouncedQ] = useState("");
  const { token } = useAuth();

  let searchTimeout: ReturnType<typeof setTimeout>;
  function onChangeQuery(text: string) {
    setQuery(text);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => setDebouncedQ(text), 400);
  }

  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ["searchNews", debouncedQ],
    queryFn: async () => {
      if (!debouncedQ) return { articles: [] };
      const res = await fetch(`${BASE_URL}/api/news/search?q=${encodeURIComponent(debouncedQ)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && searchType === "news" && !!debouncedQ,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["searchUsers", debouncedQ],
    queryFn: async () => {
      if (!debouncedQ) return { users: [] };
      const res = await fetch(`${BASE_URL}/api/users/search?q=${encodeURIComponent(debouncedQ)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && searchType === "people" && !!debouncedQ,
  });

  const { data: trending } = useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/news/trending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !debouncedQ,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Explore</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder={searchType === "news" ? "Search news..." : "Search people..."}
          placeholderTextColor={Colors.textTertiary} value={query} onChangeText={onChangeQuery}
          autoCapitalize="none" autoCorrect={false} />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(""); setDebouncedQ(""); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setSearchType("news")} style={[styles.tab, searchType === "news" && styles.tabActive]}>
          <Text style={[styles.tabText, searchType === "news" && styles.tabTextActive]}>News</Text>
        </Pressable>
        <Pressable onPress={() => setSearchType("people")} style={[styles.tab, searchType === "people" && styles.tabActive]}>
          <Text style={[styles.tabText, searchType === "people" && styles.tabTextActive]}>People</Text>
        </Pressable>
      </View>

      {!debouncedQ && searchType === "news" ? (
        <FlatList
          data={trending?.articles || []}
          keyExtractor={(item: any) => item.id}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Trending</Text>}
          renderItem={({ item }: { item: any }) => (
            <Pressable onPress={() => router.push({ pathname: "/article/[id]", params: { id: item.id } })}
              style={({ pressed }) => [styles.trendItem, pressed && { opacity: 0.7 }]}>
              <View style={styles.trendContent}>
                <Text style={styles.trendCategory}>{item.category}</Text>
                <Text style={styles.trendTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.trendMeta}>{item.sourceName} · {item.likesCount} likes</Text>
              </View>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.trendImage} contentFit="cover" />
              ) : null}
            </Pressable>
          )}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        />
      ) : searchType === "news" ? (
        newsLoading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
        ) : (
          <FlatList
            data={newsData?.articles || []}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: { item: any }) => (
              <Pressable onPress={() => router.push({ pathname: "/article/[id]", params: { id: item.id } })}
                style={({ pressed }) => [styles.trendItem, pressed && { opacity: 0.7 }]}>
                <View style={styles.trendContent}>
                  <Text style={styles.trendCategory}>{item.category}</Text>
                  <Text style={styles.trendTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.trendMeta}>{item.sourceName}</Text>
                </View>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.trendImage} contentFit="cover" />
                ) : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No results for "{debouncedQ}"</Text>
              </View>
            }
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
          />
        )
      ) : usersLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={usersData?.users || []}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <Pressable onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.id } })}
              style={({ pressed }) => [styles.userItem, pressed && { opacity: 0.7 }]}>
              <View style={styles.avatar}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{item.displayName?.[0]?.toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.displayName}</Text>
                <Text style={styles.userHandle}>@{item.username}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </Pressable>
          )}
          ListEmptyComponent={
            debouncedQ ? <View style={styles.center}>
              <Text style={styles.emptyText}>No people found</Text>
            </View> : <View style={styles.center}>
              <Text style={styles.emptyText}>Search for people to follow</Text>
            </View>
          }
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, paddingHorizontal: 16, paddingBottom: 12, letterSpacing: -0.5 },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, marginBottom: 12, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular" },
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, paddingHorizontal: 16, paddingVertical: 10 },
  trendItem: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  trendContent: { flex: 1, paddingRight: 12 },
  trendCategory: { fontSize: 11, color: Colors.primary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", marginBottom: 4 },
  trendTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, lineHeight: 22, marginBottom: 4 },
  trendMeta: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  trendImage: { width: 72, height: 72, borderRadius: 10 },
  userItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  userHandle: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" },
});
