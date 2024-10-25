import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { updateProfile, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function ProfileScreen() {
  const [userData, setUserData] = useState(null);
  const [name, setName] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Fetch user data from FireStore
  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setName(data.name || '');
        } else {
          console.log("No such user exists in Firestore!");
        }
      }
    } catch (error) {
      console.log("Error fetching user data: ", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // update user's name
  const updateUserName = () => {
    if (name.trim() === '') {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    const user = auth.currentUser;
    if (user) {
      updateProfile(user, { displayName: name})
        .then(() => {
          Alert.alert('Success', 'Name updated successfully');
          setEditMode(false);
          // update Firestore with new name
          const docRef = doc(db, "users", user.uid);
          setDoc(docRef, { name }, { merge: true })
            .then(() => fetchUserData())
            .catch(error => console.log("Error updating Firestore: ", error));
        })
        .catch(error => {
          Alert.alert('Error', error.message);
        });
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => {
            signOut(auth)
              .then(() => {
                console.log("Successfully signed out of the account");
              })
              .catch(error => Alert.alert('Error', error.message));
          }
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Display user's email */}
      <Text style={styles.info}>Email: {userData?.email || 'Loading...'}</Text>

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
                <Text style={styles.info}>Name: {userData?.name || 'No name set'}</Text>

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