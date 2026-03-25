import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const NOTIF_ICONS: Record<string, { name: any; color: string }> = {
  like: { name: "heart", color: Colors.primary },
  comment: { name: "chatbubble", color: Colors.accentBlue },
  follow: { name: "person-add", color: Colors.accentGreen },
  share: { name: "paper-plane", color: Colors.accent },
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Mark as read after fetch
      fetch(`${BASE_URL}/api/notifications/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={data?.notifications || []}
          keyExtractor={(item: any) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-outline" size={52} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtext}>When someone likes or comments on your activity, you'll see it here.</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const icon = NOTIF_ICONS[item.type] || { name: "notifications", color: Colors.textSecondary };
            return (
              <Pressable onPress={() => item.articleId && router.push({ pathname: "/article/[id]", params: { id: item.articleId } })}
                style={({ pressed }) => [styles.notifItem, !item.isRead && styles.notifUnread, pressed && { opacity: 0.7 }]}>
                <View style={[styles.iconWrap, { backgroundColor: icon.color + "20" }]}>
                  <Ionicons name={icon.name} size={18} color={icon.color} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifMessage}>{item.message}</Text>
                  <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  backBtn: { padding: 10 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtext: { fontSize: 14, color: Colors.textTertiary, fontFamily: "Inter_400Regular", textAlign: "center" },
  notifItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: 12 },
  notifUnread: { backgroundColor: Colors.surface },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1 },
  notifMessage: { fontSize: 14, color: Colors.text, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 2 },
  notifTime: { fontSize: 12, color: Colors.textTertiary, fontFamily: "Inter_400Regular" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
});
