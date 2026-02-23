import HeaderHome from "@/components/HeaderHome";
import { StyleSheet, View } from "react-native";
import Banner from "../../components/Banner";
import ModuleList from "../../components/ModuleList";

export const styles = StyleSheet.create({
  screen: {
    display: "flex",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
});

export default function Index() {
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
