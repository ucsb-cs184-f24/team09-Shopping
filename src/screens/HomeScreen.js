import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler'; // Import Swipeable
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; // Import Firestore and Auth config
import { Picker } from '@react-native-picker/picker'; // Import Picker from the new package
import { Ionicons } from '@expo/vector-icons';

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

  // Fetch real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groceryLists'), (snapshot) => {
      const lists = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setShoppingList(lists);

      // Filter list if a category is selected
      if (selectedCategory) {
        const filteredList = lists.filter(item => item.houseCodeCategory === selectedCategory);
        setFilteredShoppingList(filteredList);
      } else {
        setFilteredShoppingList(lists); // Show all items when no filter is selected
      }

      // Extract unique categories from the list
      const uniqueCategories = [...new Set(lists.map(item => item.houseCodeCategory))];
      setCategories(uniqueCategories);
    });

    return () => unsubscribe(); // Cleanup on component unmount
  }, [selectedCategory]); // Re-run effect if selectedCategory changes

  // Function to add a new item to Firestore
  const addItemToList = async () => {
    if (newItem.trim() === '' || newItemCategory.trim() === '') {
      Alert.alert('Error', 'Please enter an item and its category');
      return;
    }

    const newItemObj = { itemName: newItem, addedBy: auth.currentUser.email, isPurchased: false, addedDate: Date.now().toString(), houseCodeCategory: newItemCategory };

    try {
      // Add the item to Firestore collection
      const docRef = await addDoc(collection(db, 'groceryLists'), newItemObj);

      // Clear the input fields
      setNewItem('');
      setNewItemCategory('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
      console.error(error);
    }
  };

  // Function to delete an item
  const deleteItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'groceryLists', itemId));
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
      const itemRef = doc(db, 'groceryLists', currentEditItem.id);
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

    if (category === '') {
      setFilteredShoppingList(shoppingList); // Show all items when no filter is selected
    } else {
      const filteredList = shoppingList.filter(item => item.houseCodeCategory === category);
      setFilteredShoppingList(filteredList);
    }

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
      // Update the purchased status in Firestore
      const itemRef = doc(db, 'groceryLists', itemId);
      await updateDoc(itemRef, { isPurchased: !currentStatus });

      // Update the local shoppingList state
      setShoppingList((prevList) =>
        prevList.map((item) =>
          item.id === itemId ? { ...item, isPurchased: !currentStatus } : item
        )
      );

      // Apply the same update to filteredShoppingList if a filter is applied
      setFilteredShoppingList((prevList) =>
        prevList.map((item) =>
          item.id === itemId ? { ...item, isPurchased: !currentStatus } : item
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update item status. Please try again.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping List</Text>
      
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
    justifyContent: 'space-between', // Places 'Select a Category' on the left and 'Close' button on the right
    alignItems: 'center', // Centers the items vertically in the row
    marginBottom: 20, // Adds some spacing between the header and the Picker
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  picker: {
    height: 150, // Increased picker height to accommodate more options
    width: '100%',
  },
  editButton: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 5,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginRight: 2,
  },
  deleteButton: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 5,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6347',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});