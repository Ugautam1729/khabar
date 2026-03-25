import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [followLoading, setFollowLoading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !!id,
  });

  async function handleFollow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowLoading(true);
    try {
      await fetch(`${BASE_URL}/api/users/${id}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile", id] });
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleMessage() {
    const res = await fetch(`${BASE_URL}/api/messages/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: id }),
    });
    const data = await res.json();
    router.push({ pathname: "/dm/[id]", params: { id: data.id, otherUserName: profile?.displayName } });
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const isOwn = currentUser?.id === id;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : !profile ? (
        <View style={styles.center}><Text style={styles.emptyText}>User not found</Text></View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.displayName?.[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.displayName}>{profile.displayName}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{profile.followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>{profile.followersCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </View>

            {!isOwn && (
              <View style={styles.actions}>
                <Pressable onPress={handleFollow} disabled={followLoading}
                  style={[styles.followBtn, profile.isFollowing && styles.followingBtn]}>
                  {followLoading ? <ActivityIndicator color={profile.isFollowing ? Colors.text : Colors.white} size="small" /> : (
                    <Text style={[styles.followText, profile.isFollowing && styles.followingText]}>
                      {profile.isFollowing ? "Following" : "Follow"}
                    </Text>
                  )}
                </Pressable>
                <Pressable onPress={handleMessage} style={styles.messageBtn}>
                  <Ionicons name="paper-plane-outline" size={18} color={Colors.text} />
                  <Text style={styles.messageBtnText}>Message</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 12 },
  backBtn: { padding: 10 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  profileSection: { alignItems: "center", padding: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  avatarText: { fontSize: 36, fontFamily: "Inter_700Bold", color: Colors.white },
  displayName: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 4 },
  username: { fontSize: 15, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginBottom: 10 },
  bio: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 16, paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", width: "100%", justifyContent: "center", gap: 40, marginBottom: 24 },
  stat: { alignItems: "center" },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.surfaceBorder },
  actions: { flexDirection: "row", gap: 12 },
  followBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  followingBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  followText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  followingText: { color: Colors.text },
  messageBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: Colors.surfaceBorder },
  messageBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
});
