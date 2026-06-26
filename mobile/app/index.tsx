import { StyleSheet, Text, View } from 'react-native'

export default function SlideshowScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Photoframe</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#e8e8e8',
    fontSize: 24,
  },
})
