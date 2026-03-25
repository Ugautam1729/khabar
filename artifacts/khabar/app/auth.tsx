import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  async function handleSubmit() {
    setError("");
    if (!email || !password || (mode === "register" && (!username || !displayName))) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password, displayName.trim());
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="newspaper" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.logoText}>Khabar</Text>
            <Text style={styles.tagline}>Stay informed. Stay connected.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <Pressable style={[styles.tab, mode === "login" && styles.tabActive]}
                onPress={() => { setMode("login"); setError(""); }}>
                <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable style={[styles.tab, mode === "register" && styles.tabActive]}
                onPress={() => { setMode("register"); setError(""); }}>
                <Text style={[styles.tabText, mode === "register" && styles.tabTextActive]}>Sign Up</Text>
              </Pressable>
            </View>

            {mode === "register" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Display Name</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textTertiary}
                      value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <View style={styles.inputWrap}>
                    <Text style={[styles.inputIcon, styles.atSymbol]}>@</Text>
                    <TextInput style={styles.input} placeholder="username" placeholderTextColor={Colors.textTertiary}
                      value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={Colors.textTertiary}
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={[styles.input, styles.inputPass]} placeholder="••••••••"
                  placeholderTextColor={Colors.textTertiary} value={password} onChangeText={setPassword}
                  secureTextEntry={!showPass} />
                <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
              onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> :
                <Text style={styles.submitText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>}
            </Pressable>
          </View>

          <Text style={styles.footerText}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <Text style={styles.footerLink} onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: "center", marginBottom: 40 },
  logoContainer: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  logoText: { fontSize: 32, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -1 },
  tagline: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabs: { flexDirection: "row", marginBottom: 24, backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.surfaceBorder },
  inputIcon: { marginLeft: 14 },
  atSymbol: { fontSize: 18, color: Colors.textSecondary, fontFamily: "Inter_500Medium", paddingLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular" },
  inputPass: { paddingRight: 48 },
  eyeBtn: { position: "absolute", right: 14, padding: 4 },
  errorText: { fontSize: 13, color: Colors.primary, fontFamily: "Inter_400Regular", marginBottom: 12, textAlign: "center" },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitBtnPressed: { opacity: 0.8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
  footerText: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 24 },
  footerLink: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
});
