import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button, View, Text, TextInput, Alert, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { getAuth, deleteUser, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { deleteDoc, doc, getDoc, setDoc, getFirestore, collection, query, where, getDocs, updateDoc, arrayRemove } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [image, setImage] = useState(null);

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
          setCreationDate(data.createdAt.toDate());
          setImage(data.profileImage || null); // Set the image URI from Firestore
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

  const formatPhoneNumber = (text) => {
    // remove all non-numeric characters
    const cleaned = ('' + text).replace(/\D/g, '');

    // format number as ###-###-####
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
        return `${match[1]}${match[2] ? '-' + match[2] : ''}${match[3] ? '-' + match[3] : ''}`;
    }

    return text;
  }

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

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;
    if (confirmationText === 'DELETE') {
      try {
        // delete user from ALL households
        const householdsRef = collection(db, "households");
        const householdsQuery = query(householdsRef, where("members", "array-contains", user.uid));
        const querySnapshot = await getDocs(householdsQuery);
        
        const removeUserPromises = querySnapshot.docs.map((householdDoc) =>
          updateDoc(householdDoc.ref, {
            members: arrayRemove(user.uid)
          })
        );
        await Promise.all(removeUserPromises);

        // delete user from Firestore and Firebase auth
        const userDocRef = doc(db, "users", user.uid);
        await deleteDoc(userDocRef);

        await deleteUser(user);

        Alert.alert("Account Deleted", "Your account has been deleted successfully.");
        setDeleteModalVisible(false);
        setConfirmationText('');
      } catch (error) {
        Alert.alert("Error", "There was an error deleting your account. Please try again.", error);
      }
    } else {
      Alert.alert("Error", "Please type 'DELETE' to confirm.");
    }
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
            onChangeText={(text) => {
              if (fieldKey === "phone") {
                setValue(formatPhoneNumber(text));
              } else {
                setValue(text);
              }
            }}
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

  const addImage = async () => {
    let _image = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4,3],
      quality: 1,
    });
    if (!_image.canceled) {
      setImage(_image.assets[0].uri);
      
      // Save image URI to Firestore
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, { profileImage: _image.assets[0].uri }, { merge: true });
      }
    }
  };
  

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: 150, height: 150 }} />
        ) : (
          <MaterialCommunityIcons name="account" size={150} color="gray" />
        )}
        <View style={styles.uploadBtnContainer}>
          <TouchableOpacity onPress={addImage} style={styles.uploadBtn}>
            <Text style={styles.uploadImageText}>{image ? 'Edit' : 'Upload'}</Text>
            <Ionicons name="camera-outline" size={20} color="black" />
          </TouchableOpacity>
        </View>
      </View>



      <View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
        </View>
      </View>

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

      {/* Delete Account button */}
      <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteAccountText}>Delete Account</Text>
      </TouchableOpacity>

      {/* Modal for confirmation */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType='slide'
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Type "DELETE to confirm</Text>
            <TextInput
              style={styles.textInput}
              placeholder='Type DELETE to confirm'
              value={confirmationText}
              onChangeText={setConfirmationText}
            />
            <TouchableOpacity style={styles.confirmButton} onPress={confirmDeleteAccount}>
              <Text style={styles.confirmButtonText}>Confirm Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelDeleteButton} onPress={() => setDeleteModalVisible(false)}>
              <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  screenHeader: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  imageContainer: {
    elevation:2,
    height:150,
    width:150,
    backgroundColor:'#efefef',
    position:'relative',
    borderRadius:999,
    overflow:'hidden',
    marginBottom: 18,
  },
  uploadBtnContainer:{
    gap: 1,
    opacity:0.7,
    position:'absolute',
    bottom:0,
    backgroundColor:'lightgrey',
    width:'100%',
    height:'25%',
  },
  uploadBtn:{
    display:'flex',
    alignItems:"center",
    justifyContent:'center'
  },
  uploadImageText: {
    fontFamily: 'Avenir'
  },
  title: {
    fontSize: 24,
    marginTop: 80,
    // marginLeft: 20,
    fontFamily: "Avenir",
    opacity: 0.5,
  },
  info: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'left',
  },
  nameContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Avenir',
    fontWeight: 'bold'
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
    marginTop: 24,
    alignItems: 'center',
  },
  creationDateText: {
    fontSize: 14,
    color: '#888',
  },
  signOutButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#0056D2',
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#003a8c',
  },
  signOutText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteAccountButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f44336',
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  deleteAccountText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    textAlign: 'center',
  },
    confirmButton: {
    backgroundColor: '#f44336',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelDeleteButton: {
    backgroundColor: '#a9a9a9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  cancelDeleteButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
