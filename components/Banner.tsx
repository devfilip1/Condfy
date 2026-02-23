import { Image, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: 200,
    borderRadius: 35,
  },
});

export default function Banner() {
  return (
    <Image
      source={require("../assets/images/condominio-brisas.jpg")}
      style={styles.image}
    />
  );
}
