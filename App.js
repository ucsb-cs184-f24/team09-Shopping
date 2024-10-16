import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCqZfBoHz9xHQauW8AujAtYWCb-wbVRoak",
  authDomain: "team09shopping.firebaseapp.com",
  projectId: "team09shopping",
  storageBucket: "team09shopping.appspot.com",
  messagingSenderId: "109915220092",
  appId: "1:109915220092:web:f00008ccde2f52b8f781f9"
};

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Welcome to the Shared Shopping App!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#fffff',  // Changing the background to red to test
  },
});

