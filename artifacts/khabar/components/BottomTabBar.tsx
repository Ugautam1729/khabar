import React from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const TABS = [
  { name: "Feed",     route: "/(tabs)",          icon: "newspaper-outline",    iconActive: "newspaper" },
  { name: "Explore",  route: "/(tabs)/explore",   icon: "search-outline",       iconActive: "search" },
  { name: "Saved",    route: "/(tabs)/saved",     icon: "bookmark-outline",     iconActive: "bookmark" },
  { name: "Messages", route: "/(tabs)/messages",  icon: "chatbubble-outline",   iconActive: "chatbubble" },
  { name: "Profile",  route: "/(tabs)/profile",   icon: "person-outline",       iconActive: "person" },
];

export default function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isIOS = Platform.OS === "ios";

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {isIOS ? (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[styles.bar, !isIOS && styles.barSolid]}>
        {TABS.map((tab) => {
          const active = pathname === tab.route || (tab.route === "/(tabs)" && pathname === "/");
          return (
            <Pressable
              key={tab.name}
              onPress={() => router.push(tab.route as any)}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
            >
              <Ionicons
                name={(active ? tab.iconActive : tab.icon) as any}
                size={22}
                color={active ? Colors.primary : Colors.textTertiary}
              />
              <Text style={[styles.label, active && styles.labelActive]}>{tab.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  bar: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 4,
  },
  barSolid: {
    backgroundColor: Colors.surface,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  labelActive: {
    color: Colors.primary,
  },
});
