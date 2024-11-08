import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, deleteDoc, query, where} from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  // Household states
  const [households, setHouseholds] = useState([]); // Array of household objects that user is part of
  const [selectedHouseholdID, setSelectedHouseholdID] = useState('');  // String of ID of selected household
  const [selectedHouseholdName, setSelectedHouseholdName] = useState(''); // NEW: Name of selected household
  const [householdMembers, setHouseholdMembers] = useState([]); // Array of objects of users within a household

  // Shopping list states
  const [shoppingListMeta, setShoppingListMeta] = useState(null); // Object of default shopping list metadeta, and ID
  const [shoppingListItems, setShoppingListItems] = useState([]);  // Array of objects of items in shopping list
  const [categories, setCategories] = useState([]);  // Array of strings of categories
  const [filteredShoppingListItems, setFilteredShoppingListItems] = useState([]);  // Array of objects of filtered items in shopping list

  // New item states
  const [newItemName, setNewItemName] = useState('');  // String of new item name
  const [newItemCategory, setNewItemCategory] = useState(''); // String of new item category
  const [newItemCost, setNewItemCost] = useState(''); // String of new item cost

  // Edit item states
  const [currentEditItem, setCurrentEditItem] = useState(null); // Object of item currently editing
  const [editItemName, setEditItemName] = useState('');  // String of new item name
  const [editItemCategory, setEditItemCategory] = useState(''); // String of edit item category
  const [editItemCost, setEditItemCost] = useState(''); // String of edit item cost
  const [selectedCategory, setSelectedCategory] = useState('');  // String of selected category

  // Modal states
  const [filterModalVisible, setFilterModalVisible] = useState(false); // Bool of modal visibility
  const [editModalVisible, setEditModalVisible] = useState(false); // Bool of modal visibility
  const [householdModalVisible, setHouseholdModalVisible] = useState(false); // Bool of modal visibility
  const [splitMembersModalVisible, setSplitMembersModalVisible] = useState(false); // Bool of modal visibility
  const [splitItemsModalVisible, setSplitItemsModalVisible] = useState(false); // Bool of modal visibility

  // Split bill states
  const [selectedMembers, setSelectedMembers] = useState([]); // Array of strings of household members IDs
  const [selectedItems, setSelectedItems] = useState([]); // Array of strings of items IDs

  // Fetch the households associated with the user and automatically assign first one
  useEffect(() => {
    const userId = auth.currentUser.uid;
    const q = query(collection(db, 'households'), where('members', 'array-contains', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userHouseholds = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setHouseholds(userHouseholds);

      // Set the first household as the default selection
      if (userHouseholds.length > 0 && !selectedHouseholdID) {
        const defaultHousehold = userHouseholds[0];
        setSelectedHouseholdID(defaultHousehold.id);
        setSelectedHouseholdName(defaultHousehold.displayHouseholdName || 'Unnamed Household');
      }
      else {
        // If there are no households, clear the selected household
        setSelectedHouseholdID('');
        setSelectedHouseholdName('');
      }
    });

    return () => unsubscribe();
  }, []);
  
  const selectHousehold = (householdId) => {
    setSelectedHouseholdID(householdId);
    
    // Find the name of the selected household
    const household = households.find(h => h.id === householdId);
    if (household) {
      setSelectedHouseholdName(household.displayHouseholdName || 'Unnamed Household');
    }

    setHouseholdModalVisible(false);
  };

  // Listen for changes in shopping list meta data
  useEffect(() => {
    if (!selectedHouseholdID) {
      setShoppingListMeta(null);
      return;
    }

    const q = collection(db, `households/${selectedHouseholdID}/shoppingLists`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shoppingLists = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get first shopping list metadata (shoppingLists[0])
      const defaultShoppingListMeta = shoppingLists[0];
      setShoppingListMeta(defaultShoppingListMeta);
    });

    return () => unsubscribe();
  }, [selectedHouseholdID]);

  // Listen for changes in items of shopping list
  useEffect(() => {
    if (!selectedHouseholdID || !shoppingListMeta) {
      setShoppingListItems([]);
      setCategories([]);
      return;
    }
  
    const itemsRef = collection(
      db,
      `households/${selectedHouseholdID}/shoppingLists/${shoppingListMeta.id}/items`
    );
    const unsubscribe = onSnapshot(itemsRef, (itemsSnapshot) => {
      const items = itemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setShoppingListItems(items);
  
      // Extract unique categories from items
      const uniqueCategories = Array.from(new Set(items.map((item) => item.category)));
      setCategories(uniqueCategories);
    });
  
    return () => unsubscribe();
  }, [shoppingListMeta]);

  
  // Filter the shopping list based on the selected category
  const filterListByCategory = (category) => {
    setSelectedCategory(category);
    setFilterModalVisible(false);
  };

  // Fetch filtered list to display. If no filter, fetch entire list.
  useEffect(() => {
    if (selectedCategory) {
      const filteredList = shoppingListItems.filter(item => item.category === selectedCategory);
      setFilteredShoppingListItems(filteredList);
    }
    else {
      setFilteredShoppingListItems(shoppingListItems);
    }
  }, [selectedCategory, shoppingListItems]);
  
  // Fetch members if selected household changes
  useEffect(() => {
    const fetchHouseholdMembers = async () => {
      if (!selectedHouseholdID) {
        setHouseholdMembers([]);
        return;
      }

      try {
        const householdDocRef = doc(db, 'households', selectedHouseholdID);
        const householdDoc = await getDoc(householdDocRef);

        const members = householdDoc.data().members;
        const membersInfo = await Promise.all(
          members.map(async (uid) => {
            try {
              const userDocRef = doc(db, 'users', uid);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                return { uid, name: userDoc.data().name };
              }
              else {
                console.warn(`No user found with UID: ${uid}`);
              }
            } catch (error) {
              console.error(`Failed to fetch user with UID: ${uid}`, error);
            }
            return null;
          })
        );

        setHouseholdMembers(membersInfo.filter(info => info !== null));
      } catch (error) {
        console.error("Error fetching household:", error);
      }
    };

    fetchHouseholdMembers();
  }, [selectedHouseholdID]);
  
  // Add a new item to Firestore
  const addItemToList = async () => {
    if (newItemName.trim() === '' || newItemCategory.trim() === '' || newItemCost.trim() === '') {
      Alert.alert('Error', 'Please enter an item, its category, and cost');
      return;
    }
  
    const newItemObj = {
      itemName: newItemName,
      category: newItemCategory,
      cost: parseFloat(newItemCost),
      addedBy: auth.currentUser.email,
      isPurchased: false,
      addedDate: new Date(),
    };
  
    try {
      const itemsRef = collection(
        db,
        `households/${selectedHouseholdID}/shoppingLists/${shoppingListMeta.id}/items`
      );
      await addDoc(itemsRef, newItemObj);
  
      setNewItemName('');
      setNewItemCategory('');
      setNewItemCost('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
      console.error(error);
    }
  };  
  
  // Delete an item
  const deleteItem = async (itemId) => {
    try {
      // Reference to the specific item in the items subcollection
      const itemRef = doc(
        db,
        `households/${selectedHouseholdID}/shoppingLists/${shoppingListMeta.id}/items/${itemId}`
      );
      // Delete the item document
      await deleteDoc(itemRef);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to delete item. Please try again.');
      console.error(error);
    }
  };  

  // Open edit modal
  const openEditModal = (item) => {
    setCurrentEditItem(item);

    setEditItemName(item.itemName);
    setEditItemCategory(item.category);
    setEditItemCost(item.cost ? item.cost.toString() : '');

    setEditModalVisible(true);
  };

  // Save edited item
  const saveEdit = async () => {
    if (!currentEditItem) return;
    try {
      const itemRef = doc(db, "households", selectedHouseholdID, "shoppingLists", shoppingListMeta.id, "items", currentEditItem.id);
      await updateDoc(itemRef, { itemName: editItemName, category: editItemCategory, cost: editItemCost });

      setEditItemName('');
      setEditItemCategory('');
      setEditItemCost('');

      setEditModalVisible(false);
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
    const totalCost = shoppingListItems
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => total + parseFloat(item.cost || 0), 0);
  
    const splitAmount = totalCost / selectedMembers.length;
  
    Alert.alert('Split Amount', `Each selected member owes: $${splitAmount.toFixed(2)}`);
  
    // TODO: Logic to store/update split info in Firestore could go here
  };

  // Toggle the purchased status of an item
  const togglePurchased = async (itemId, currentStatus) => {
    try {
      // Update the purchased status in Firestore
      const itemRef = doc(db, "households", selectedHouseholdID, "shoppingLists", shoppingListMeta.id, "items", itemId);
      await updateDoc(itemRef, { isPurchased: !currentStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update item status. Please try again.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.selectedHouseholdText}>
        {selectedHouseholdName ? `Current Household: ${selectedHouseholdName}` : 'No household selected'}
      </Text>

      <TouchableOpacity style={styles.householdButton} onPress={() => setHouseholdModalVisible(true)}>
        <Text style={styles.householdButtonText}>Select Household</Text>
      </TouchableOpacity>
            
      <TextInput
        style={styles.input}
        placeholder="Add a new item..."
        value={newItemName}
        onChangeText={setNewItemName}
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

      <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
        <Text style={styles.filterButtonText}>Filter</Text>
      </TouchableOpacity>
          
      <FlatList
        data={filteredShoppingListItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() => (
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
            )}
          >
            <View style={styles.listItem}>
              <View style={styles.textContainer}>
                <Text style={[styles.itemName, item.isPurchased && styles.purchasedText]}>
                  {item.itemName} - ${item.cost}
                </Text>
                <Text style={[styles.addedByText, item.isPurchased && styles.purchasedText]}>
                  added by {item.addedBy}
                </Text>
                <Text style={[item.isPurchased && styles.purchasedText]}>
                  Category: {item.category}
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
              data={shoppingListItems}
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
      
      {/* Modal for editing items */}
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
              value={editItemName}
              onChangeText={setEditItemName}
            />

            <TextInput
              style={styles.input}
              placeholder="Edit category"
              value={editItemCategory}
              onChangeText={setEditItemCategory}
            />

            <TextInput
              style={styles.input}
              placeholder="Edit cost"
              value={editItemCost}
              onChangeText={setEditItemCost}
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
      
      {/* Modal for selecting a household */}
      <Modal visible={householdModalVisible} animationType="slide" transparent={true} onRequestClose={() => setHouseholdModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Household</Text>
              <Button title="Close" onPress={() => setHouseholdModalVisible(false)} />
            </View>

            <Picker
              selectedValue={selectedHouseholdID}
              onValueChange={(itemValue) => selectHousehold(itemValue)}
              style={styles.picker}
            >
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
  selectedHouseholdText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
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
    height: '30%',
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