import React from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["saved"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/news/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  async function handleUnsave(id: string) {
    await fetch(`${BASE_URL}/api/news/${id}/save`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    queryClient.invalidateQueries({ queryKey: ["saved"] });
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Saved</Text>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={data?.articles || []}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="bookmark-outline" size={52} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No saved articles</Text>
              <Text style={styles.emptySubtext}>Tap the bookmark icon to save articles</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <Pressable onPress={() => router.push({ pathname: "/article/[id]", params: { id: item.id } })}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Ionicons name="newspaper-outline" size={28} color={Colors.textTertiary} />
                </View>
              )}
              <View style={styles.cardContent}>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <Text style={styles.cardTitle} numberOfLines={3}>{item.title}</Text>
                <Text style={styles.cardSource}>{item.sourceName}</Text>
              </View>
              <Pressable onPress={() => handleUnsave(item.id)} style={styles.unsaveBtn}>
                <Ionicons name="bookmark" size={16} color={Colors.accentBlue} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, paddingHorizontal: 16, paddingBottom: 12, letterSpacing: -0.5 },
  columnWrapper: { gap: 10, paddingHorizontal: 16 },
  listContent: { gap: 10, paddingBottom: 20 },
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.surfaceBorder },
  cardImage: { width: "100%", height: 110 },
  cardImagePlaceholder: { backgroundColor: Colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  cardContent: { padding: 10 },
  cardCategory: { fontSize: 10, color: Colors.primary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", marginBottom: 4 },
  cardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, lineHeight: 18, marginBottom: 4 },
  cardSource: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  unsaveBtn: { position: "absolute", top: 8, right: 8, backgroundColor: Colors.overlay, borderRadius: 8, padding: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtext: { fontSize: 14, color: Colors.textTertiary, fontFamily: "Inter_400Regular", textAlign: "center" },
});
