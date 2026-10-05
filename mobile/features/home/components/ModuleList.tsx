import { Octicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import modules, { Module } from "@/features/home/data/modules";

export const styles = StyleSheet.create({
  overContainer: {
    display: "flex",
    marginTop: 20,
  },
  container: {
    padding: 25,
    backgroundColor: "white",
    display: "flex",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    borderRadius: 35,
    width: 160,
  },
  iconContainer: {
    borderRadius: 15,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#E2E2E2",
    height: 70,
    width: 70,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {},
  title: {
    fontWeight: "bold",
    fontSize: 16,
  },
  desc: {
    color: "#B7B7B7",
  },
});

export default function ModuleList() {
  return (
    <FlatList
      style={styles.overContainer}
      data={modules}
      keyExtractor={(item) => item.name}
      renderItem={({ item }) => <ModuleItem modul={item} />}
      numColumns={2}
      columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 20 }}
    />
  );
}

export function ModuleItem({ modul }: { modul: Module }) {
  return (
    <TouchableOpacity
      // Cada módulo abre a SUA rota. Antes todos abriam `/visitors`, então tocar em Reservas
      // levava para a tela de Visitantes. `null` = módulo anunciado sem tela: não navega.
      onPress={() => {
        if (modul.route) {
          router.push(modul.route);
        }
      }}
      disabled={modul.route === null}
      accessibilityRole="button"
      accessibilityLabel={`${modul.name}. ${modul.description}`}
      accessibilityState={{ disabled: modul.route === null }}
    >
      <View key={modul.name} style={styles.container}>
        <View style={styles.iconContainer}>
          <Octicons style={styles.icon} name={modul.icon} size={40} />
        </View>
        <Text style={styles.title}>{modul.name}</Text>
        <Text style={styles.desc}>{modul.description}</Text>
      </View>
    </TouchableOpacity>
  );
}
