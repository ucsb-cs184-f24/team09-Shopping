// HomeScreen.js
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';


export default function AboutScreen() {
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This app authenticates with: </Text>
      <Text style = {styles.detail}> Firebase</Text>
      <Text style={styles.title}>This app runs using: </Text>
      <Text style = {styles.detail}> Expo</Text>
      <Text style={styles.title}>This app is written with </Text>
      <Text style = {styles.detail}> Javascript, React Native JS</Text>
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
    fontSize: 30,
    marginBottom: 10,
    color: 'purple',
  },
  detail: {
    fontSize: 20,
    marginBottom: 10,
    color: '#4f4289',
  }
  
});
