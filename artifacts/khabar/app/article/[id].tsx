import React, { useState, useRef } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  StatusBar, Platform, TextInput, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { fetch } from "expo/fetch";
import BottomTabBar from "@/components/BottomTabBar";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTED = [
  "What are the key takeaways?",
  "Why does this matter?",
  "What's the background context?",
  "Who are the key people involved?",
];

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const chatScrollRef = useRef<ScrollView>(null);
  const outerScrollRef = useRef<ScrollView>(null);

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLiked(data.isLiked);
      setSaved(data.isSaved);
      setLikesCount(data.likesCount);
      setCommentsCount(data.commentsCount);
      return data;
    },
    enabled: !!token && !!id,
  });

  async function handleLike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    await fetch(`${BASE_URL}/api/news/${id}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved(!saved);
    await fetch(`${BASE_URL}/api/news/${id}/save`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    queryClient.invalidateQueries({ queryKey: ["saved"] });
  }

  async function sendMessage(text: string) {
    if (!text.trim() || aiLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setAiLoading(true);

    const aiMsg: ChatMessage = { role: "assistant", content: "", streaming: true };
    setMessages([...updatedMessages, aiMsg]);

    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
      outerScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await fetch(`${BASE_URL}/api/ai/chat/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: fullContent, streaming: true };
                  return next;
                });
                chatScrollRef.current?.scrollToEnd({ animated: false });
              }
              if (parsed.done) break;
            } catch {}
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: fullContent, streaming: false };
        return next;
      });
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "Sorry, I couldn't respond. Please try again.", streaming: false };
        return next;
      });
    } finally {
      setAiLoading(false);
    }
  }

  function toggleChat() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatOpen((prev) => !prev);
    if (!chatOpen) {
      setTimeout(() => outerScrollRef.current?.scrollToEnd({ animated: true }), 300);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Article not found</Text>
      </View>
    );
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPadding }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        ref={outerScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.meta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
          <Text style={styles.source}>{article.sourceName}</Text>
        </View>

        <Text style={styles.title}>{article.title}</Text>

        <View style={styles.statsRow}>
          <Ionicons name="heart" size={14} color={Colors.textTertiary} />
          <Text style={styles.statsText}>{likesCount} likes</Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons name="chatbubble-outline" size={13} color={Colors.textTertiary} />
          <Text style={styles.statsText}>{commentsCount} comments</Text>
        </View>

        {article.imageUrl ? (
          <Image source={{ uri: article.imageUrl }} style={styles.heroImage}
            contentFit="cover" transition={300} />
        ) : null}

        <View style={styles.content}>
          <Text style={styles.summary}>{article.summary}</Text>
          {article.content && article.content !== article.summary ? (
            <Text style={styles.body}>{article.content}</Text>
          ) : null}
        </View>

        {/* AI Chat Panel */}
        <Pressable onPress={toggleChat} style={styles.aiHeader}>
          <View style={styles.aiHeaderLeft}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={18} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.aiHeaderTitle}>Ask Khabar AI</Text>
              <Text style={styles.aiHeaderSub}>
                {messages.length === 0
                  ? "Chat with AI about this story"
                  : `${messages.filter(m => m.role === "user").length} question${messages.filter(m => m.role === "user").length !== 1 ? "s" : ""} asked`}
              </Text>
            </View>
          </View>
          <Ionicons
            name={chatOpen ? "chevron-up" : "chevron-down"}
            size={18} color={Colors.textSecondary}
          />
        </Pressable>

        {chatOpen && (
          <View style={styles.chatPanel}>
            {/* Messages */}
            {messages.length === 0 ? (
              <View style={styles.welcomeBox}>
                <Text style={styles.welcomeText}>
                  Hi! I know everything about this article. Ask me anything.
                </Text>
                <View style={styles.suggestions}>
                  {SUGGESTED.map((q) => (
                    <Pressable key={q} onPress={() => sendMessage(q)}
                      style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.7 }]}>
                      <Text style={styles.suggestionText}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <ScrollView
                ref={chatScrollRef}
                style={styles.messagesList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((msg, i) => (
                  <View key={i} style={[styles.msgRow, msg.role === "user" && styles.msgRowUser]}>
                    {msg.role === "assistant" && (
                      <View style={styles.aiBubbleIcon}>
                        <Ionicons name="sparkles" size={12} color={Colors.white} />
                      </View>
                    )}
                    <View style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.aiBubble]}>
                      <Text style={[styles.bubbleText, msg.role === "user" && styles.userBubbleText]}>
                        {msg.content}
                        {msg.streaming && msg.content.length > 0 && (
                          <Text style={styles.cursor}>▋</Text>
                        )}
                      </Text>
                      {msg.streaming && msg.content.length === 0 && (
                        <View style={styles.typingDots}>
                          <ActivityIndicator size="small" color={Colors.textSecondary} />
                          <Text style={styles.typingText}>Thinking...</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Input row */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Ask anything about this story..."
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(inputText)}
              />
              <Pressable
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || aiLoading}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!inputText.trim() || aiLoading) && styles.sendBtnDisabled,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {aiLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={16} color={Colors.white} />
                )}
              </Pressable>
            </View>

            {/* Quick suggestions after first message */}
            {messages.length > 0 && !aiLoading && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.quickSuggestions} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                {SUGGESTED.filter(q =>
                  !messages.some(m => m.role === "user" && m.content === q)
                ).slice(0, 3).map((q) => (
                  <Pressable key={q} onPress={() => sendMessage(q)}
                    style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.quickChipText}>{q}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Action row */}
        <View style={styles.actionRow}>
          <Pressable onPress={handleLike}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={24}
              color={liked ? Colors.primary : Colors.textSecondary} />
            {likesCount > 0 && (
              <Text style={[styles.actionCount, liked && { color: Colors.primary }]}>{likesCount}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push({ pathname: "/comments/[id]", params: { id: article.id } })}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.textSecondary} />
            {commentsCount > 0 && <Text style={styles.actionCount}>{commentsCount}</Text>}
          </Pressable>

          <Pressable onPress={() => router.push({ pathname: "/share", params: { articleId: article.id } })}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
            <Ionicons name="paper-plane-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionLabel}>Share</Text>
          </Pressable>

          <Pressable onPress={handleSave}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={22}
              color={saved ? Colors.accentBlue : Colors.textSecondary} />
            <Text style={[styles.actionLabel, saved && { color: Colors.accentBlue }]}>
              {saved ? "Saved" : "Save"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomTabBar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },

  navBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8 },
  navBtn: { padding: 10 },

  meta: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  categoryBadge: { backgroundColor: Colors.primary + "20", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, color: Colors.primary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  source: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },

  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, lineHeight: 30, paddingHorizontal: 16, marginBottom: 10 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, marginBottom: 16 },
  statsText: { fontSize: 13, color: Colors.textTertiary, fontFamily: "Inter_400Regular" },
  dot: { fontSize: 13, color: Colors.textTertiary },

  heroImage: { width: "100%", height: 220, marginBottom: 16 },
  content: { paddingHorizontal: 16 },
  summary: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.text, lineHeight: 26, marginBottom: 12 },
  body: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 24, marginBottom: 24 },

  aiHeader: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 0,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    padding: 14, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderBottomWidth: 0,
  },
  aiHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  aiHeaderTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  aiHeaderSub: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },

  chatPanel: {
    marginHorizontal: 16, backgroundColor: Colors.surface,
    borderRadius: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0,
    borderWidth: 1, borderTopWidth: 0, borderColor: Colors.surfaceBorder,
    marginBottom: 12, overflow: "hidden",
  },

  welcomeBox: { padding: 16 },
  welcomeText: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 14 },
  suggestions: { gap: 8 },
  suggestionChip: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  suggestionText: { fontSize: 14, color: Colors.text, fontFamily: "Inter_400Regular" },

  messagesList: { maxHeight: 380, paddingHorizontal: 12, paddingTop: 12 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10, gap: 8 },
  msgRowUser: { flexDirection: "row-reverse" },
  aiBubbleIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
    marginBottom: 2, flexShrink: 0,
  },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 12 },
  aiBubble: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  userBubble: { backgroundColor: Colors.primary },
  bubbleText: { fontSize: 14, color: Colors.text, fontFamily: "Inter_400Regular", lineHeight: 20 },
  userBubbleText: { color: Colors.white },
  cursor: { color: Colors.primary, fontWeight: "bold" },
  typingDots: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
  },
  chatInput: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: Colors.text, fontFamily: "Inter_400Regular", maxHeight: 90,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },

  quickSuggestions: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },
  quickChip: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  quickChipText: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },

  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    marginHorizontal: 16, marginTop: 4, marginBottom: 24,
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1,
    borderColor: Colors.surfaceBorder, paddingVertical: 14, paddingHorizontal: 8,
  },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 4 },
  actionBtnPressed: { opacity: 0.6 },
  actionCount: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  actionLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
});
