import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler'; // Import Swipeable
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, deleteDoc, query, where, getFirestore, setDoc} from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; // Import Firestore and Auth config
import { Picker } from '@react-native-picker/picker'; // Import Picker from the new package
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';


export default function HomeScreen() {
  const [shoppingList, setShoppingList] = useState([]);  // State for shopping list
  const [filteredShoppingList, setFilteredShoppingList] = useState([]);  // State for filtered shopping list
  const [newItem, setNewItem] = useState('');  // State for new item input
  const [newItemCategory, setNewItemCategory] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);  // State for modal visibility
  const [selectedCategory, setSelectedCategory] = useState('');  // State for selected filter category
  const [categories, setCategories] = useState([]);  // State to hold dynamic categories
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null); // State to hold the item being edited
  const [selectedHousehold, setSelectedHousehold] = useState('');  // Selected household ID
  const [households, setHouseholds] = useState([]);  // All households for the user
  const [householdModalVisible, setHouseholdModalVisible] = useState(false);

  // Fetch the households associated with the user
  useEffect(() => {
    const userId = auth.currentUser.uid;
    const q = query(collection(db, 'households'), where('members', 'array-contains', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userHouseholds = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setHouseholds(userHouseholds);
    });

    return () => unsubscribe();
  }, []);

  // Fetch grocery lists for the selected household
  useEffect(() => {
    if (!selectedHousehold) return;

    const q = collection(db, `households/${selectedHousehold}/groceryLists`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setShoppingList(listItems);

      // Extract unique categories from the list for the current household
      const uniqueCategories = [...new Set(listItems.map(item => item.houseCodeCategory))];
      setCategories(uniqueCategories);
    });

    return () => unsubscribe();
  }, [selectedHousehold]);

  useEffect(() => {
    if (selectedCategory) {
      const filteredList = shoppingList.filter(item => item.houseCodeCategory === selectedCategory);
      setFilteredShoppingList(filteredList);
    } else {
      setFilteredShoppingList(shoppingList);
    }
  }, [selectedCategory, shoppingList]); // Re-run when either selectedCategory or shoppingList changes

   // Register user for notifications
   useEffect(() => {
    const registerForNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
  
         // Save the token in Firestore under the user's document
        await setDoc(doc(db, 'users', auth.currentUser.uid), { fcmToken: token }, { merge: true });
  
        return token;
      } else {
        console.log('Notifications permission not granted.');
      }
    }
    registerForNotifications();
   }, []);

  async function sendPushNotification(tokens, message) {
    const payload = {
      notification: {
        title: "New Item Added",
        body: message,
      },
      tokens: tokens, // Send to all tokens in the array
    }
  }

  async function sendNotifToHousehold(newItemObj, selectedHousehold) {
    const currentUserId = auth.currentUser.uid;
    try {
      await addDoc(collection(db, `households/${selectedHousehold}/groceryLists`), newItemObj);
      setNewItem('');
      setNewItemCategory('');

      const householdRef = doc(db, 'households', selectedHousehold);
      const householdSnapshot = await getDoc(householdRef);
      const householdData = householdSnapshot.data();
  
      if (householdData && householdData.members) {
        const membersToNotify = householdData.members.filter(memberId => memberId != currentUserId)
        const tokens = [];
        for (const memberId of membersToNotify) {
          const userSnapshot = await getDoc(doc(db, 'users', memberId));
          const userData = userSnapshot.data();
          if (userData && userData.fcmToken) {
            tokens.push(userData.fcmToken);
          }
        }

        if (tokens.length > 0) {
          await sendPushNotification(tokens, message);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
      console.error(error);
    }
  };

  // Function to add a new item to Firestore
  const addItemToList = async () => {
    if (newItem.trim() === '' || newItemCategory.trim() === '') {
      Alert.alert('Error', 'Please enter an item and its category');
      return;
    }
  
    const newItemObj = {
      itemName: newItem,
      category: newItemCategory,
      addedBy: auth.currentUser.email,
      isPurchased: false,
      addedDate: new Date(),
    };
  
    try {
      await addDoc(collection(db, `households/${selectedHousehold}/groceryLists`), newItemObj);
      setNewItem('');
      setNewItemCategory('');
  
      // Send notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Item Added',
          body: `${newItemObj.itemName} has been added to your grocery list`,
        },
        trigger: null, // Send instantly
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
      console.error(error);
    }
  };
  
  const deleteItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, `households/${selectedHousehold}/groceryLists/${itemId}`));
      setShoppingList((prevList) => prevList.filter((item) => item.id !== itemId));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete item. Please try again.');
      console.error(error);
    }
  };

  // Function to open edit modal
  const openEditModal = (item) => {
    setCurrentEditItem(item);
    setNewItem(item.itemName);
    setNewItemCategory(item.houseCodeCategory);
    setEditModalVisible(true);
  };

  // Function to save edited item
  const saveEdit = async () => {
    if (!currentEditItem) return;
    try {
      const itemRef = doc(db, `households/${selectedHousehold}/groceryLists`, currentEditItem.id);
      await updateDoc(itemRef, { itemName: newItem, houseCodeCategory: newItemCategory });

      setShoppingList((prevList) =>
        prevList.map((item) =>
          item.id === currentEditItem.id ? { ...item, itemName: newItem, houseCodeCategory: newItemCategory } : item
        )
      );
      setEditModalVisible(false);
      setNewItem('');
      setNewItemCategory('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      console.error(error);
    }
  };

  // Function to filter the shopping list based on the selected category
  const filterListByCategory = (category) => {
    setSelectedCategory(category);
    setFilterModalVisible(false); // Close the modal after selecting
  };

  // Render edit and delete buttons for Swipeable
  const renderRightActions = (item) => (
    <View style={{ flexDirection: 'row' }}>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => openEditModal(item)}
      >
        <Text style={styles.actionText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteItem(item.id)}
      >
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  // Function to toggle the purchased status of an item
  const togglePurchased = async (itemId, currentStatus) => {
  try {
    const itemRef = doc(db, `households/${selectedHousehold}/groceryLists`, itemId);
    await updateDoc(itemRef, { isPurchased: !currentStatus });

    setShoppingList((prevList) =>
      prevList.map((item) =>
        item.id === itemId ? { ...item, isPurchased: !currentStatus } : item
      )
    );

    if (!currentStatus) {
      // Schedule a reminder if the item is not purchased
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder to Buy Item',
          body: `Don't forget to buy ${itemId} from your grocery list!`,
        },
        trigger: {
          seconds: 3 * 24 * 60 * 60, // 3 days in seconds
        },
      });
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to update item status. Please try again.');
    console.error(error);
  }
};


  const selectHousehold = (householdId) => {
    setSelectedHousehold(householdId);
    setHouseholdModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping List</Text>

      <TouchableOpacity style={styles.householdButton} onPress={() => setHouseholdModalVisible(true)}>
        <Text style={styles.householdButtonText}>Select Household</Text>
      </TouchableOpacity>
      
      <TextInput
        style={styles.input}
        placeholder="Add a new item..."
        value={newItem}
        onChangeText={setNewItem}
      />
      <TextInput
        style={styles.input}
        placeholder="Add item category..."
        value={newItemCategory}
        onChangeText={setNewItemCategory}
      />

      <Button title="Add Item" onPress={addItemToList} />

      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setFilterModalVisible(true)}
      >
        <Text style={styles.filterButtonText}>Filter</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredShoppingList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Swipeable renderRightActions={() => renderRightActions(item)}>
            <View style={styles.listItem}>
              <View style={styles.textContainer}>
                <Text style={[styles.itemName, item.isPurchased && styles.purchasedText]}>
                  {item.itemName}
                </Text>
                <Text style={[styles.addedByText, item.isPurchased && styles.purchasedText]}>
                  added by {item.addedBy}
                </Text>
                <Text style={[item.isPurchased && styles.purchasedText]}>
                  Category: {item.houseCodeCategory}
                </Text>
              </View>
              
              {/* Radio button to indicate that item has been purchased */}
              <TouchableOpacity 
                style={styles.radioButton}
                onPress={() => togglePurchased(item.id, item.isPurchased)}
              >
                <Ionicons
                  name={item.isPurchased ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color={item.isPurchased ? 'orange' : 'gray'}
                />
              </TouchableOpacity>
            </View>
          </Swipeable>
        )}
      />

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.editModalContent}>
            <TextInput
              style={styles.input}
              placeholder="Edit item name"
              value={newItem}
              onChangeText={setNewItem}
            />
            <TextInput
              style={styles.input}
              placeholder="Edit category"
              value={newItemCategory}
              onChangeText={setNewItemCategory}
            />
            <View style={styles.buttonContainer}>
              <Button title="Save" onPress={saveEdit} />
              <Button title="Cancel" onPress={() => setEditModalVisible(false)} color="red" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for filter selection */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.filterModalContent}>
            {/* Header Row with 'Select a Category' and 'Close' Button */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Category</Text>
              <Button title="Close" onPress={() => setFilterModalVisible(false)} />
            </View>

            <Picker
              selectedValue={selectedCategory}
              onValueChange={(itemValue) => filterListByCategory(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="No Filter" value="" />
              {categories.map((category, index) => (
                <Picker.Item key={index} label={category} value={category} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>

      {/* Modal for household selection */}
      <Modal visible={householdModalVisible} animationType="slide" transparent={true} onRequestClose={() => setHouseholdModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Household</Text>
              <Button title="Close" onPress={() => setHouseholdModalVisible(false)} />
            </View>
            <Picker
              selectedValue={selectedHousehold}
              onValueChange={(itemValue) => selectHousehold(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select Household" value="" />
              {households.map((household) => (
                <Picker.Item
                  key={household.id}
                  label={household.displayHouseholdName || "Unnamed Household"}
                  value={household.id}
                />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f9f9f9',
    marginBottom: 5,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flexDirection: 'column',
    flex: 1,
    marginRight: 10,
  },
  purchasedText: {
    color: 'gray',
    textDecorationLine: 'line-through',
  },
  radioButton: {
    padding: 5,
  },
  itemName: {
    fontWeight: 'bold',
  },
  addedByText: {
    color: 'gray',
  },
  filterButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 4,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  householdButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  householdButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    justifyContent: 'center',
    height: '25%',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    height: '38%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  picker: {
    height: 150,
    width: '100%',
  },
  editButton: {
    padding: 10,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginRight: 2,
    borderRadius: 4,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#FF6347',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 4,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});