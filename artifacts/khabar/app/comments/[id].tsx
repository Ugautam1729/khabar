import React, { useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/news/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !!id,
  });

  async function handleSend() {
    if (!text.trim() || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSending(true);
    try {
      await fetch(`${BASE_URL}/api/news/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Comments</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={data?.comments || []}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubble-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No comments yet. Be first!</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{item.user?.displayName?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>{item.user?.displayName}</Text>
                  <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
            </View>
          )}
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        <TextInput style={styles.input} placeholder="Add a comment..." placeholderTextColor={Colors.textTertiary}
          value={text} onChangeText={setText} multiline maxLength={500}
          returnKeyType="send" onSubmitEditing={handleSend} />
        <Pressable onPress={handleSend} disabled={!text.trim() || sending}
          style={({ pressed }) => [styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled, pressed && { opacity: 0.7 }]}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> :
            <Ionicons name="send" size={18} color={Colors.white} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  backBtn: { padding: 10 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  listContent: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" },
  commentItem: { flexDirection: "row", gap: 12 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.surfaceBorder },
  commentAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentUser: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  commentTime: { fontSize: 12, color: Colors.textTertiary, fontFamily: "Inter_400Regular" },
  commentText: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 20 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, gap: 10, backgroundColor: Colors.background },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular", maxHeight: 100, borderWidth: 1, borderColor: Colors.surfaceBorder },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
});
