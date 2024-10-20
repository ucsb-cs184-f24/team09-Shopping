import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { auth } from '../../firebaseConfig';
import { updateProfile, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName || '');
  const [editMode, setEditMode] = useState(false);
  const navigation = useNavigation();

  // Function to update the user's name
  const updateUserName = () => {
    if (name.trim() === '') {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    updateProfile(user, { displayName: name })
      .then(() => {
        Alert.alert('Success', 'Name updated successfully');
        setEditMode(false);
      })
      .catch(error => {
        Alert.alert('Error', error.message);
      });
  };

  // Function for user to sign out
  // TODO: need to fix "LoginScreen page not found in navigator" error message
  const handleSignOut = () => {
    signOut(auth)
    .then(() => {
        navigation.navigate('LoginScreen');
    })
    .catch(error => Alert.alert('Error', error.message));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Display user's email */}
      <Text style={styles.info}>Email: {user?.email}</Text>

      {/* Name section */}
      <View style={styles.nameContainer}>
        {editMode ? (
            <>
            {/* Input field to edit name */}
            <TextInput 
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
            />
            <Button title="Save" onPress={updateUserName} />
            </>
        ) : (
            <View style={styles.nameDisplay}>
                {/* Display name */}
                <Text style={styles.info}>Name: {user?.displayName || 'No name set'}</Text>

                {/* Pencil icon to enable editing */}
                <TouchableOpacity onPress={() => setEditMode(true)}>
                    <Ionicons name="pencil" size={24} color="black" />
                </TouchableOpacity>
            </View>
        )}
      </View>

      {/* Sign Out button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 16,
  },
  info: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    width: '100%',  // Make the input take the full width
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 20,  // Add space between input and other elements
    borderRadius: 4,
  },
  nameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
  },
  nameContainer: {
    width: '80%',
    alignItems: 'center'
  },
  signOutButton: {
    marginTop: 300,
    padding: 10,
    backgroundColor: '#f44336',
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});