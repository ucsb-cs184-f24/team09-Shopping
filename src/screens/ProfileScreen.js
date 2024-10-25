import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function ProfileScreen() {
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState({
    name: false,
    phone: false,
    address: false,
    password: false,
  });
  const [originalData, setOriginalData] = useState({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [creationDate, setCreationDate] = useState(null);

  // Fetch user data from Firestore
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
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setCreationDate(data.createdAt.toDate())
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

  // Reset the profile state when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset edit mode and fields when the user navigates back to this screen
      setEditMode({
        name: false,
        phone: false,
        address: false,
        password: false,
      });
      setPassword('');
      setCurrentPassword('');
    }, [])
  );

  // Function to re-authenticate the user
  const reauthenticate = async (currentPassword) => {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    try {
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (error) {
      Alert.alert('Error', 'Re-authentication failed. Please check your password and try again.');
      return false;
    }
  };

  // Function to update user information in Firestore
  const updateUserInfo = (field) => {
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, "users", user.uid);
      setDoc(docRef, { [field]: field === 'name' ? name : field === 'phone' ? phone : address }, { merge: true })
        .then(() => {
          Alert.alert('Success', `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);
          setEditMode((prev) => ({ ...prev, [field]: false }));
          fetchUserData();
        })
        .catch(error => console.log("Error updating Firestore: ", error));
    }
  };

  // Function to update user's password
  const updateUserPassword = async () => {
    if (password.trim() === '') {
      Alert.alert('Error', 'Please enter a valid password');
      return;
    }

    const user = auth.currentUser;
    const isReauthenticated = await reauthenticate(currentPassword);
    if (isReauthenticated) {
      updatePassword(user, password)
        .then(async () => {
          Alert.alert('Success', 'Password updated successfully');
          setPassword('');
          setCurrentPassword('');
          setEditMode((prev) => ({ ...prev, password: false }));

          // store timestamp to indicate when password was updated
          const docRef = doc(db, "users", user.uid);
          try {
            await setDoc(docRef, { passwordLastUpdated: new Date() }, { merge: true });
            console.log("Password update timestamp saved in Firestore.");
          } catch (error) {
            console.log("Error saving password update timestamp: ", error);
          }
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
        { text: "Cancel", style: "cancel" },
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

  const enterEditMode = (fieldKey) => {
    setOriginalData({
      name,
      phone,
      address,
      password,
    });
    setEditMode((prev) => ({ ...prev, [fieldKey]: true }));
  };

  const cancelEdit = (fieldKey) => {
    setName(originalData.name);
    setPhone(originalData.phone);
    setAddress(originalData.address);
    setPassword('');
    setCurrentPassword('');
    setEditMode((prev) => ({ ...prev, [fieldKey]: false }));
  };

  const renderField = (label, value, setValue, fieldKey) => (
    <View style={styles.fieldContainer}>
      {editMode[fieldKey] ? (
        <>
          <TextInput
            style={styles.input}
            placeholder={`Enter your ${label.toLowerCase()}`}
            value={value}
            onChangeText={setValue}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => updateUserInfo(fieldKey)} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => cancelEdit(fieldKey)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.fieldDisplay}>
          <Text style={styles.info}>{label}: {value || `No ${label.toLowerCase()} set`}</Text>
          <TouchableOpacity onPress={() => enterEditMode(fieldKey)}>
            <Ionicons name="pencil" size={24} color="black" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Display user's email in the same format as other fields */}
      <View style={styles.fieldContainer}>
        <View style={styles.fieldDisplay}>
          <Text style={styles.info}>Email: {userData?.email || 'Loading...'}</Text>
        </View>
      </View>

      {/* Editable fields */}
      {renderField("Name", name, setName, "name")}
      {renderField("Phone", phone, setPhone, "phone")}
      {renderField("Address", address, setAddress, "address")}

      {/* Password change section */}
      {editMode.password ? (
        <View style={styles.fieldContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!currentPasswordVisible}
            />
            <TouchableOpacity onPress={() => setCurrentPasswordVisible(!currentPasswordVisible)}>
              <Ionicons name={currentPasswordVisible ? "eye" : "eye-off"} size={24} color="black" />
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
            />
            <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
              <Ionicons name={passwordVisible ? "eye" : "eye-off"} size={24} color="black" />
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={updateUserPassword} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => cancelEdit("password")} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => enterEditMode("password")} style={styles.passwordButton}>
          <Text style={styles.passwordButtonText}>Change Password</Text>
        </TouchableOpacity>
      )}

      {/* Display account creation date */}
      {creationDate && (
        <View style={styles.creationDateContainer}>
          <Text style={styles.creationDateText}>
            Account created on: {creationDate.toLocaleDateString()} {creationDate.toLocaleTimeString()}
          </Text>
        </View>
      )}

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
    textAlign: 'left',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10,
    borderRadius: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginTop: 5,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  fieldContainer: {
    width: '80%',
    alignItems: 'flex-start',
    marginVertical: 10,
  },
  fieldDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#0782F9',
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'black',
    fontWeight: '700',
    fontSize: 16,
  },
  passwordButton: {
    backgroundColor: '#0782F9',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
  },
  passwordButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  creationDateContainer: {
    marginTop: 300,
    alignItems: 'center',
  },
  creationDateText: {
    fontSize: 14,
    color: '#888',
  },
  signOutButton: {
    marginTop: 20,
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
