import React, { useState } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function ShareScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);
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
  });

  const convos = (data?.conversations || []).filter((c: any) =>
    !search || c.otherUser?.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSend(convoId: string) {
    setSending(convoId);
    try {
      await fetch(`${BASE_URL}/api/messages/conversations/${convoId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: "Check this out!", articleId }),
      });
      setSent((prev) => [...prev, convoId]);
    } finally {
      setSending(null);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Share Article</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search conversations..." value={search}
          onChangeText={setSearch} placeholderTextColor={Colors.textTertiary} autoCapitalize="none" />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : convos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-outline" size={40} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Follow people to share articles with them</Text>
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: any }) => {
            const isSent = sent.includes(item.id);
            const isSending = sending === item.id;
            return (
              <View style={styles.convoItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.otherUser?.displayName?.[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.convoName}>{item.otherUser?.displayName}</Text>
                <Pressable
                  onPress={() => !isSent && handleSend(item.id)}
                  style={[styles.sendBtn, isSent && styles.sendBtnSent]}
                  disabled={isSent}>
                  {isSending ? <ActivityIndicator color="#fff" size="small" /> :
                    isSent ? <Ionicons name="checkmark" size={16} color={Colors.white} /> :
                      <Text style={styles.sendBtnText}>Send</Text>}
                </Pressable>
              </View>
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
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, margin: 16, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  emptySubtext: { fontSize: 13, color: Colors.textTertiary, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
  convoItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white },
  convoName: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  sendBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 64, alignItems: "center" },
  sendBtnSent: { backgroundColor: Colors.accentGreen },
  sendBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
