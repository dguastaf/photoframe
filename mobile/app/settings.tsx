import { Link } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Link href="/" style={styles.backLink}>
        <Text style={styles.backText}>← Back</Text>
      </Link>
      <Text style={styles.title}>Settings</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 24,
  },
  backLink: {
    marginBottom: 16,
  },
  backText: {
    color: '#e8e8e8',
    fontSize: 16,
  },
  title: {
    color: '#e8e8e8',
    fontSize: 24,
    fontWeight: 'bold',
  },
})
