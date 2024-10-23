import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, onSnapshot } from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; // Import Firestore and Auth config

export default function HomeScreen() {
  const [shoppingList, setShoppingList] = useState([]);  // State for shopping list
  const [newItem, setNewItem] = useState('');  // State for new item input

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
    if (newItem.trim() === '') {
      Alert.alert('Error', 'Please enter an item');
      return;
    }

    try {
      // Add new item with all required fields to Firestore
      await addDoc(collection(db, 'groceryLists'), {
        itemName: newItem,
        addedBy: auth.currentUser.email,  // Assumes user is logged in
        isPurchased: false,
        addedDate: new Date(),
        houseCode: 'your-household-code',  // Replace with actual household code
        category: 'Groceries'  // Example category
      });
      setNewItem(''); // Clear the input
    } catch (error) {
      console.error("Error adding item to Firestore: ", error);
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

      <Button title="Add Item" onPress={addItemToList} />

      <FlatList
        data={shoppingList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>{item.itemName} - {item.addedBy}</Text>
            <Text>{item.category}</Text>
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
  },
});
