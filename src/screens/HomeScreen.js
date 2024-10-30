import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler'; // Import Swipeable
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, arrayUnion, deleteDoc, query, where} from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; // Import Firestore and Auth config
import { Picker } from '@react-native-picker/picker'; // Import Picker from the new package
import { Ionicons } from '@expo/vector-icons';




export default function HomeScreen() {
  const [shoppingList, setShoppingList] = useState([]);  // State for shopping list
  const [filteredShoppingList, setFilteredShoppingList] = useState([]);  // State for filtered shopping list
  const [newItem, setNewItem] = useState('');  // State for new item input
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);  // State for modal visibility
  const [selectedCategory, setSelectedCategory] = useState('');  // State for selected filter category
  const [categories, setCategories] = useState([]);  // State to hold dynamic categories
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null); // State to hold the item being edited
  const [selectedHousehold, setSelectedHousehold] = useState('');  // Selected household ID
  const [households, setHouseholds] = useState([]);  // All households for the user
  const [householdModalVisible, setHouseholdModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitMembersModalVisible, setSplitMembersModalVisible] = useState(false);
  const [splitItemsModalVisible, setSplitItemsModalVisible] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);





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

  useEffect(() => {
    if (selectedHousehold) {
      getHouseholdMembersInfo(selectedHousehold); // Fetch and update the members info
    }
  }, [selectedHousehold]);
  

  // Fetch grocery lists for the selected household
  useEffect(() => {
    if (!selectedHousehold) return;

    const q = collection(db, `households/${selectedHousehold}/groceryLists`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      getHouseholdMembersInfo(selectedHousehold);
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



  const getHouseholdMembersInfo = async (householdId) => {
    const householdDocRef = doc(db, 'households', householdId);
    const householdDoc = await getDoc(householdDocRef);
  
    if (householdDoc.exists()) {
      const members = householdDoc.data().members;
  
      // Fetch user data for each member
      const membersInfo = await Promise.all(
        members.map(async (uid) => {
          try {
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              return { uid, name: userDoc.data().name };
            } else {
              console.warn(`No user found with UID: ${uid}`);
            }
          } catch (error) {
            console.error(`Failed to fetch user with UID: ${uid}`, error);
          }
          return null;
        })
      );
  
      setHouseholdMembers(membersInfo.filter(info => info !== null));
    } else {
      console.log('No such household!');
    }
  };
  
  const joinHousehold = async (householdId, userId) => {
    const householdDocRef = doc(db, 'households', householdId);
    await updateDoc(householdDocRef, {
      members: arrayUnion(userId) // Ensure this userId is the correct Firebase UID
    });
  };
  
  
  // Function to add a new item to Firestore

  
  const addItemToList = async () => {
    if (newItem.trim() === '' || newItemCategory.trim() === '' || newItemCost.trim() === '') {
      Alert.alert('Error', 'Please enter an item and its category');
      return;
    }

    const newItemObj = {
      itemName: newItem,
      category: newItemCategory,
      cost: parseFloat(newItemCost),
      addedBy: auth.currentUser.email,
      isPurchased: false,
      addedDate: new Date(),
    };

    try {
      await addDoc(collection(db, `households/${selectedHousehold}/groceryLists`), newItemObj);
      setNewItem('');
      setNewItemCategory('');
      setNewItemCost('');
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
    setNewItemCost(item.cost);
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
      setNewItemCost('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      console.error(error);
    }
  };

  const splitBill = () => {
    if (selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member to split the bill.');
      return;
    }
  
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to split.');
      return;
    }
  
    // Calculate the total cost of the selected items
    const totalCost = shoppingList
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => total + parseFloat(item.cost || 0), 0);
  
    const splitAmount = totalCost / selectedMembers.length;
  
    Alert.alert('Split Amount', `Each selected member owes: $${splitAmount.toFixed(2)}`);
  
    // Logic to store/update split info in Firestore could go here
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
      // Update the purchased status in Firestore
      const itemRef = doc(db, `households/${selectedHousehold}/groceryLists`, itemId);
      await updateDoc(itemRef, { isPurchased: !currentStatus });

      // Update the local shoppingList state
      setShoppingList((prevList) =>
        prevList.map((item) =>
          item.id === itemId ? { ...item, isPurchased: !currentStatus } : item
        )
      );
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
      {/* <Text style={styles.title}>Shopping List</Text> */}

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
      <TextInput
        style={styles.input}
        placeholder="Add item cost..."
        value={newItemCost}
        onChangeText={setNewItemCost}
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
                  {item.itemName} - ${item.cost}
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

<TouchableOpacity
  style={styles.splitButton}
  onPress={() => setSplitMembersModalVisible(true)}  // Update here to use the member modal state
>
  <Text style={styles.splitButtonText}>Split the Bill</Text>
</TouchableOpacity>

{/* Modal for selecting members to split */}
<Modal
  visible={splitMembersModalVisible}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setSplitMembersModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.splitModalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Select Members to Split the Bill</Text>
        <Button title="Close" onPress={() => setSplitMembersModalVisible(false)} />
      </View>

      <FlatList
        data={householdMembers}
        keyExtractor={(item) => item.uid} // Use `uid` as the key
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 10,
              backgroundColor: selectedMembers.includes(item.uid) ? '#007BFF' : '#fff',
              borderRadius: 4,
              marginBottom: 5,
            }}
            onPress={() => {
              setSelectedMembers(prevSelected =>
                prevSelected.includes(item.uid)
                  ? prevSelected.filter(member => member !== item.uid)
                  : [...prevSelected, item.uid]
              );
            }}
          >
            <Text style={{ color: selectedMembers.includes(item.uid) ? '#fff' : '#000' }}>
              {item.name} {/* Display the member's name */}
            </Text>
          </TouchableOpacity>
        )}
      />



      <Button
        title="Next: Select Items"
        onPress={() => {
          if (selectedMembers.length === 0) {
            Alert.alert('Error', 'Please select at least one member.');
          } else {
            setSplitMembersModalVisible(false);
            setSplitItemsModalVisible(true);  // Correctly set the visibility of the items modal
          }
        }}
      />
    </View>
  </View>
</Modal>

{/* Modal for selecting items to split */}
<Modal
  visible={splitItemsModalVisible}  // Use the items modal visibility state
  animationType="slide"
  transparent={true}
  onRequestClose={() => setSplitItemsModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.splitModalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Select Items to Split</Text>
        <Button title="Close" onPress={() => setSplitItemsModalVisible(false)} />
      </View>

      {/* Display list of items */}
      <FlatList
        data={shoppingList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 10,
              backgroundColor: selectedItems.includes(item.id) ? '#007BFF' : '#fff',
              borderRadius: 4,
              marginBottom: 5,
            }}
            onPress={() => {
              setSelectedItems(prevSelected =>
                prevSelected.includes(item.id)
                  ? prevSelected.filter(i => i !== item.id)
                  : [...prevSelected, item.id]
              );
            }}
          >
            <Text style={{ color: selectedItems.includes(item.id) ? '#fff' : '#000' }}>
              {item.itemName} - ${item.cost}
            </Text>
          </TouchableOpacity>
        )}
      />
      <Button
        title="Confirm Split"
        onPress={() => {
          splitBill();
          setSplitItemsModalVisible(false);  // Correctly close the items modal
        }}
      />
    </View>
  </View>
</Modal>




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
  splitButton: {
    alignSelf: 'center',
    backgroundColor: '#FF6347',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  splitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  splitModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    height: '60%',
  },
  
});