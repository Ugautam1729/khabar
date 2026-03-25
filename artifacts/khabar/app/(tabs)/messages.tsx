import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 10000,
  });

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Messages</Text>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={data?.conversations || []}
          keyExtractor={(item: any) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubble-outline" size={52} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Find people in Explore and share articles</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <Pressable onPress={() => router.push({ pathname: "/dm/[id]", params: { id: item.id, otherUserName: item.otherUser?.displayName } })}
              style={({ pressed }) => [styles.convoItem, pressed && { opacity: 0.7 }]}>
              <View style={styles.avatar}>
                {item.otherUser?.avatarUrl ? (
                  <Image source={{ uri: item.otherUser.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{item.otherUser?.displayName?.[0]?.toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.convoInfo}>
                <View style={styles.convoHeader}>
                  <Text style={styles.convoName}>{item.otherUser?.displayName}</Text>
                  <Text style={styles.convoTime}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage || "No messages yet"}</Text>
              </View>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtext: { fontSize: 14, color: Colors.textTertiary, fontFamily: "Inter_400Regular", textAlign: "center" },
  convoItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  convoInfo: { flex: 1 },
  convoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  convoName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, flex: 1 },
  convoTime: { fontSize: 12, color: Colors.textTertiary, fontFamily: "Inter_400Regular" },
  lastMsg: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
});
