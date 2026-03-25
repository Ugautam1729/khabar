import React, { useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DMChatScreen() {
  const { id, otherUserName } = useLocalSearchParams<{ id: string; otherUserName: string }>();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dm", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/messages/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !!id,
    refetchInterval: 5000,
  });

  const messages = (data?.messages || []).reverse();

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`${BASE_URL}/api/messages/conversations/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
      queryClient.invalidateQueries({ queryKey: ["dm", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } finally {
      setSending(false);
    }
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container} keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerName}>{otherUserName || "Chat"}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item: any) => item.id}
          inverted
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.centerInverted}>
              <Text style={styles.emptyText}>Start the conversation!</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const isOwn = item.senderId === user?.id;
            return (
              <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
                <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  {item.article && (
                    <Pressable onPress={() => router.push({ pathname: "/article/[id]", params: { id: item.article.id } })}
                      style={styles.sharedArticle}>
                      <Ionicons name="newspaper-outline" size={14} color={Colors.primary} />
                      <Text style={styles.sharedArticleText} numberOfLines={2}>{item.article.title}</Text>
                    </Pressable>
                  )}
                  <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.content}</Text>
                  <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        <TextInput style={styles.input} placeholder="Message..." placeholderTextColor={Colors.textTertiary}
          value={text} onChangeText={setText} multiline maxLength={1000} />
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
  headerName: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerInverted: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  listContent: { padding: 16, gap: 6 },
  msgRow: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 4 },
  msgRowOwn: { justifyContent: "flex-end" },
  bubble: { maxWidth: "75%", borderRadius: 18, padding: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  bubbleOwn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bubbleText: { fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bubbleTextOwn: { color: Colors.white },
  bubbleTime: { fontSize: 11, color: Colors.textTertiary, fontFamily: "Inter_400Regular", marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeOwn: { color: "rgba(255,255,255,0.7)" },
  sharedArticle: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 8, padding: 8, marginBottom: 6 },
  sharedArticleText: { fontSize: 12, color: Colors.text, fontFamily: "Inter_500Medium", flex: 1 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, gap: 10, backgroundColor: Colors.background },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular", maxHeight: 100, borderWidth: 1, borderColor: Colors.surfaceBorder },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
});
