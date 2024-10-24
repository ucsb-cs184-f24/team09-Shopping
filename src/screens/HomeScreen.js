// HomeScreen.js
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function HomeScreen() {
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Anika's App!</Text>
      <Text> Navigate to your account at the bottom navigation, or click about to learn the technology of this app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    marginBottom: 20,
    color: 'purple',
  },
  
});
