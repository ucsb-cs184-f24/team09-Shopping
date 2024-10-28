import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [households, setHouseholds] = useState([]);  // All households for the user
  const [selectedHousehold, setSelectedHousehold] = useState('');  // Selected household ID
  const [shoppingList, setShoppingList] = useState([]);  // Shopping list for selected household
  const [newItem, setNewItem] = useState('');  
  const [newItemCategory, setNewItemCategory] = useState('');
  const [modalVisible, setModalVisible] = useState(false); // Modal visibility for picker

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
    });

    return () => unsubscribe();
  }, [selectedHousehold]);

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

  const renderRightActions = (item) => (
    <View style={{ flexDirection: 'row' }}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteItem(item.id)}
      >
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const selectHousehold = (householdId) => {
    setSelectedHousehold(householdId);
    setModalVisible(false); // Close the modal after selection
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grocery List</Text>

      {/* Household Picker Modal */}
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <View style={styles.pickerButton}>
          <Text style={styles.pickerButtonText}>
            {selectedHousehold ? households.find(h => h.id === selectedHousehold)?.displayHouseholdName : 'Select a Household'}
          </Text>
          <Ionicons name="caret-down" size={20} color="gray" />
        </View>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Household</Text>
            {households.map((household) => (
              <TouchableOpacity
                key={household.id}
                style={styles.modalItem}
                onPress={() => selectHousehold(household.id)}
              >
                <Text style={styles.modalItemText}>{household.displayHouseholdName}</Text>
              </TouchableOpacity>
            ))}
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>

      {/* Add Item Input */}
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

      {/* Shopping List */}
      <FlatList
        data={shoppingList}
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
                <Text style={item.isPurchased && styles.purchasedText}>
                  Category: {item.category}
                </Text>
              </View>
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 16,
  },
  pickerButtonText: {
    fontSize: 16,
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
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
