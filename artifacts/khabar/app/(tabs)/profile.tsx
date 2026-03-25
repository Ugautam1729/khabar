import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName, bio }),
      });
      const updated = await res.json();
      updateUser(updated);
      setEditing(false);
    } catch (e) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => { logout(); router.replace("/auth"); } },
    ]);
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName}
                placeholderTextColor={Colors.textTertiary} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio}
                placeholderTextColor={Colors.textTertiary} placeholder="Tell people about yourself..."
                multiline numberOfLines={3} />
            </View>
            <View style={styles.editBtns}>
              <Pressable onPress={() => setEditing(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> :
                  <Text style={styles.saveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.displayName}>{user?.displayName}</Text>
            <Text style={styles.username}>@{user?.username}</Text>
            {user?.bio ? <Text style={styles.bioText}>{user.bio}</Text> : null}
            <Pressable onPress={() => setEditing(true)} style={styles.editBtn}>
              <Ionicons name="pencil-outline" size={14} color={Colors.text} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
          </>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user?.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <Pressable style={styles.menuItem} onPress={() => router.push("/(tabs)/saved")}>
            <Ionicons name="bookmark-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Saved Articles</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable style={styles.menuItem} onPress={() => router.push("/notifications")}>
            <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.section, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.menuText}>About Khabar</Text>
            <Text style={styles.menuValue}>v1.0.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, flex: 1, letterSpacing: -0.5 },
  logoutBtn: { padding: 8 },
  profileCard: { margin: 16, backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: Colors.surfaceBorder },
  avatarWrap: { marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: Colors.white },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 4 },
  username: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginBottom: 8 },
  bioText: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 12 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20, borderWidth: 1, borderColor: Colors.surfaceBorder },
  editBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  statsRow: { flexDirection: "row", width: "100%", alignItems: "center" },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.surfaceBorder },
  editForm: { width: "100%" },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, textTransform: "uppercase" },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: 10, padding: 12, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: Colors.surfaceBorder },
  bioInput: { height: 80, textAlignVertical: "top" },
  editBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveText: { fontSize: 14, color: Colors.white, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  menuCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, flex: 1 },
  menuValue: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  menuDivider: { height: 1, backgroundColor: Colors.surfaceBorder, marginLeft: 48 },
});
