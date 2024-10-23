import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; // Import Firestore and Auth config
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    
    const newItemObj = { itemName: newItem, addedBy: auth.currentUser.email, isPurchased: false, addedDate: Date.now().toString(), houseCodeCategory: newItemCategory };
    
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

  const togglePurchased = async (itemId, currentStatus) => {
    try {
      // Update the purchased status in Firestore
      const itemRef = doc(db, 'groceryLists', itemId);
      const docSnap = await getDoc(itemRef);

      if (docSnap.exists()) {
        await updateDoc(itemRef, { isPurchased: !currentStatus });

        setShoppingList((prevList) =>
          prevList.map((item) =>
            item.id === itemId ? { ...item, isPurchased: !currentStatus } : item
          )
        );
      } else {
        console.log('No such document found!');
        Alert.alert('Error', 'Document not found in Firestore.');
      }
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

      <FlatList
        data={shoppingList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
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

            {/* Radio button to indicate that item has been purchased. */}
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
  }
});
