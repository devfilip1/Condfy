import HeaderHome from "@/features/home/components/HeaderHome";
import { StyleSheet, View } from "react-native";
import Banner from "@/features/home/components/Banner";
import ModuleList from "@/features/home/components/ModuleList";

export const styles = StyleSheet.create({
  screen: {
    display: "flex",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
});

export default function HomeScreen() {
  return (
    <>
      <HeaderHome />
      <View style={styles.screen}>
        <Banner />
        <ModuleList />
      </View>
    </>
  );
}
