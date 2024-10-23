import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, onSnapshot } from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; // Import Firestore and Auth config


export default function HomeScreen() {
  const [shoppingList, setShoppingList] = useState([]);  // State for shopping list
  const [newItem, setNewItem] = useState('');  // State for new item input
  const [newItemCategory, setNewItemCategory] = useState('');


  // Fetch real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groceryLists'), (snapshot) => {
      const lists = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setShoppingList(lists);
    });

    return () => unsubscribe(); // Cleanup on component unmount
  }, []);

  // Function to add a new item to Firestore
  const addItemToList = async () => {
    if (newItem.trim() === '' || newItemCategory.trim() ==='') {
      Alert.alert('Error', 'Please enter an item and its category');
      return;
    }
    
    const newItemObj = { itemName: newItem, addedBy: 'insertUser', isPurchased: false, addedDate: Date.now().toString(), houseCodeCategory: newItemCategory };
    
    try {
      // Add the item to Firestore collection
      const docRef = await addDoc(collection(db, 'groceryLists'), newItemObj);



      // Update local state after successful Firestore addition
      setShoppingList([...shoppingList, { id: docRef.id, ...newItemObj }]);
      // Clear the input field
      setNewItem('');
      setNewItemCategory('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
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

      <FlatList
        data={shoppingList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>{item.itemName} - {item.addedBy}</Text>
            <Text>Category: {item.houseCodeCategory}</Text>
          </View>
        )}
      />
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
});
