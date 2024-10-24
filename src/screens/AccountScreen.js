// AccountScreen.js
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function AccountScreen() {
  const user = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('User signed out!');
      // Navigation is handled by the auth state listener in App.js
    } catch (error) {
      console.error('Sign out error:', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Account</Text>
      {user && (
        <Text style={styles.email}>Email: {user.email}</Text>
      )}
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 100,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    marginBottom: 20,
    color: 'purple',
  },
  email: {
    fontSize: 18,
    marginBottom: 40,
    color: '#333',
  },
});
