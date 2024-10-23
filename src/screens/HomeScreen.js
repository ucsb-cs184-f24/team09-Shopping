import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { collection, addDoc, onSnapshot } from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; // Import Firestore and Auth config
import { Picker } from '@react-native-picker/picker'; // Import Picker from the new package

export default function HomeScreen() {
  const [shoppingList, setShoppingList] = useState([]);  // State for shopping list
  const [filteredShoppingList, setFilteredShoppingList] = useState([]);  // State for filtered shopping list
  const [newItem, setNewItem] = useState('');  // State for new item input
  const [newItemCategory, setNewItemCategory] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);  // State for modal visibility
  const [selectedCategory, setSelectedCategory] = useState('');  // State for selected filter category
  const [categories, setCategories] = useState([]);  // State to hold dynamic categories

  // Fetch real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groceryLists'), (snapshot) => {
      const lists = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setShoppingList(lists);
      setFilteredShoppingList(lists); // Initialize filtered list as full list

      // Extract unique categories from the list
      const uniqueCategories = [...new Set(lists.map(item => item.houseCodeCategory))];
      setCategories(uniqueCategories);
    });

    return () => unsubscribe(); // Cleanup on component unmount
  }, []);

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

      // Update local state after successful Firestore addition
      const updatedList = [...shoppingList, { id: docRef.id, ...newItemObj }];
      setShoppingList(updatedList);
      setFilteredShoppingList(updatedList); // Update filtered list as well

      // Update categories with the new item
      const uniqueCategories = [...new Set(updatedList.map(item => item.houseCodeCategory))];
      setCategories(uniqueCategories);

      // Clear the input fields
      setNewItem('');
      setNewItemCategory('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
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
          <View style={styles.listItem}>
            <Text>{item.itemName} - {item.addedBy}</Text>
            <Text>Category: {item.houseCodeCategory}</Text>
          </View>
        )}
      />

      {/* Modal for filter selection */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
  modalContent: {
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
});