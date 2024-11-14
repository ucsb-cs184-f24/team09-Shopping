import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, deleteDoc, query, where} from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

// TODO (COMPLETE): remove items from list of respective household when user leaves group
// TODO (COMPLETE): do not allow split bill on checked off items
// TODO (COMPLETE): Only allow split bill if household has more than 1 user, implement cleaner UI i.e. button padding

export default function HomeScreen() {
  const [households, setHouseholds] = useState([]); // Array of household objects that user is part of
  const [selectedHouseholdID, setSelectedHouseholdID] = useState('');  // String of ID of selected household
  const [shoppingListMeta, setShoppingListMeta] = useState(null); // Object of default shopping metadeta, and ID
  const [shoppingListItems, setShoppingListItems] = useState([]);  // Array of objects of items in shopping list
  const [categories, setCategories] = useState([]);  // Array of strings of categories
  const [householdMembers, setHouseholdMembers] = useState([]); // Array of objects of users within a household
  const [filteredShoppingListItems, setFilteredShoppingListItems] = useState([]);  // Array of objects of filtered items in shopping list
  const [newItem, setNewItemName] = useState('');  // String of new item name
  const [newItemCategory, setNewItemCategory] = useState(''); // String of new item category
  const [newItemCost, setNewItemCost] = useState(''); // String of new item cost
  const [currentEditItem, setCurrentEditItem] = useState(null); // Object of item currently editing

  const [selectedCategory, setSelectedCategory] = useState('');  
  const [filterModalVisible, setFilterModalVisible] = useState(false);  // State for modal visibility
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [householdModalVisible, setHouseholdModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitMembersModalVisible, setSplitMembersModalVisible] = useState(false);
  const [splitItemsModalVisible, setSplitItemsModalVisible] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [costModalVisible, setCostModalVisible] = useState(false);
  const [currentItemForCost, setCurrentItemForCost] = useState(null);
  const [inputCost, setInputCost] = useState('');

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

      // clear shopping list data if selected household no longer available
      if (!userHouseholds.some(h => h.id === selectedHouseholdID)) {
        setSelectedHouseholdID('');
        setShoppingListMeta(null);
        setShoppingListItems([]);
      }
    });

    return () => unsubscribe();
  }, []);
  
  // Select household by updating householdId
  const selectHousehold = (householdId) => {
    if (householdId && households.some(h => h.id === householdId)) {
      setSelectedHouseholdID(householdId);
    } else {
      setSelectedHouseholdID(null);
      setShoppingListMeta(null);
      setShoppingListItems([]);
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
  }, [selectedHouseholdID, shoppingListMeta]);

  // Function to filter the shopping list based on the selected category
  const filterListByCategory = (category) => {
    setSelectedCategory(category);
    setFilterModalVisible(false); // Close the modal after selecting
  };

  // Fetch list to display
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
    if (newItem.trim() === '' || newItemCategory.trim() === '') {
      Alert.alert('Error', 'Please enter an item and its category');
      return;
    }
  
    const newItemObj = {
      itemName: newItem,
      category: newItemCategory,
      cost: newItemCost ? parseFloat(newItemCost) : null,
      addedBy: auth.currentUser.email,
      isPurchased: false,
      addedDate: new Date(),
    };
  
    try {
      const itemsRef = collection(
        db,
        `households/${selectedHouseholdID}/shoppingLists/${shoppingListMeta.id}/items`
      );
      // Add item to shopping list
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
    setNewItemName(item.itemName);
    setNewItemCategory(item.category);
    setNewItemCost(item.cost ? item.cost.toString() : '');
    setEditModalVisible(true);
  };

  // Save edited item
  const saveEdit = async () => {
    if (!currentEditItem) return;
    try {
      const itemRef = doc(db, "households", selectedHouseholdID, "shoppingLists", shoppingListMeta.id, "items", currentEditItem.id);
      await updateDoc(itemRef, { itemName: newItem, category: newItemCategory, cost: newItemCost });

      setEditModalVisible(false);
      setNewItemName('');
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

    // filter out purchased (checked off) items from 
    const unpaidItems = shoppingListItems.filter(
      (item) => selectedItems.includes(item.id) && !item.isPurchased
    );
  
    // Calculate the total cost of the selected items
    const totalCost = unpaidItems.reduce(
      (total, item) => total + parseFloat(item.cost || 0),
      0
    );

    const splitAmount = totalCost / (selectedMembers.length + 1);  // split with TOTAL people in household
  
    Alert.alert('Split Amount', `Each selected member owes: $${splitAmount.toFixed(2)}`);
  
    // Logic to store/update split info in Firestore could go here
  };

  // Function to toggle the purchased status of an item
  const togglePurchased = async (itemId, currentStatus, item) => {
    if (!currentStatus) {
      setCurrentItemForCost(item);
      setCostModalVisible(true);
    } else {
      try {
        const itemRef = doc(db, "households", selectedHouseholdID, "shoppingLists", shoppingListMeta.id, "items", itemId);
        await updateDoc(itemRef, { isPurchased: !currentStatus });
      } catch (error) {
        Alert.alert('Error', 'Failed to update item status. Please try again.');
        console.error(error);
      }
    }
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

  const selectedHousehold = households.find(
    (household) => household.id === selectedHouseholdID
  );

  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>Shopping List</Text> */}

{/* Display the currently selected household */}
<Text style={styles.selectedHouseholdText}>
  {selectedHousehold
    ? `Current Household: ${
        selectedHousehold.displayHouseholdName || 'Unnamed Household'
      }`
    : 'No household selected'}
</Text>
      <TouchableOpacity style={styles.householdButton} onPress={() => setHouseholdModalVisible(true)}>
        <Text style={styles.householdButtonText}>Select Household</Text>
      </TouchableOpacity>

      <Modal
        visible={householdModalVisible}
        animationType='slide'
        transparent={true}
        onRequestClose={() => setHouseholdModalVisible(false)}></Modal>
      
      <TextInput
        style={styles.input}
        placeholder="Add a new item..."
        value={newItem}
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
        placeholder="Add item cost (Optional)"
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
                  Category: {item.category}
                </Text>
              </View>
              {/* Radio button to indicate that item has been purchased */}
              <TouchableOpacity 
                style={styles.radioButton}
                onPress={() => togglePurchased(item.id, item.isPurchased, item)}
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
        onPress={() => {
          if (!selectedHouseholdID) {
            Alert.alert('Error', 'Please choose a household.');
          } else if (shoppingListItems.length === 0) {
            Alert.alert('Error', 'There are no items in the list for this household.');
          } else if (householdMembers.length <= 1) {
            Alert.alert('Error', 'You need at least one other member in the household to split the bill.');
          } else {
            setSplitMembersModalVisible(true); // only open Split Bill modal if there are other members to split with
          }
        }}
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
              <Text style={styles.modalTitle}>Select Members to Split Bill</Text>
              <Button title="Close" onPress={() => setSplitMembersModalVisible(false)} />
            </View>
            <FlatList
              data={householdMembers.filter(member => member.uid !== auth.currentUser.uid)} // exclude current user so cannot split with themselves
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
        <View style={styles.closeButtonContainer}>
          <Button title="Close" onPress={() => setSplitItemsModalVisible(false)} />
        </View>
      </View>

      {/* Display list of items */}
      <FlatList
        data={shoppingListItems.filter((item) => !item.isPurchased)} // exclude checked off items
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
          if (selectedItems.length === 0) {
            Alert.alert('Error', 'Please select at least one item to split the bill.');
          } else {
            splitBill();
            setSplitItemsModalVisible(false);  // Correctly close the items modal
          }
        }}
      />
    </View>
  </View>
</Modal>

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
        onChangeText={setNewItemName}
      />
      <TextInput
        style={styles.input}
        placeholder="Edit category"
        value={newItemCategory}
        onChangeText={setNewItemCategory}
      />
      <TextInput
        style={styles.input}
        placeholder="Edit price"
        value={newItemCost}
        onChangeText={setNewItemCost}
      />
      <View style={styles.buttonContainer}>
        <Button title="Save" onPress={saveEdit} />
        <View style={{ width: 15 }}/>
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

    <Modal visible={householdModalVisible} animationType="slide" transparent={true} onRequestClose={() => setHouseholdModalVisible(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Household</Text>
            <Button title="Close" onPress={() => setHouseholdModalVisible(false)} />
          </View>
          <View style={styles.pickerContainer}>
            {households.length > 0 ? (
              <Picker
              selectedValue={selectedHouseholdID}
              onValueChange={(itemValue) => selectHousehold(itemValue)}
              style={styles.picker}
              dropdownIconColor="#007BFF"
              mode='dropdown' // dropdown for android
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
            ) : (
              <Text style={styles.noHouseholdsText}>No households available :(</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>

    <Modal
      visible={costModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setCostModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.editModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Item Cost</Text>
            <Button title="Close" onPress={() => setCostModalVisible(false)} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter item cost"
            value={inputCost}
            onChangeText={setInputCost}
            keyboardType="numeric"
          />
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.actionButtonWrapper}
              onPress={async () => {
                try {
                  const itemRef = doc(db, "households", selectedHouseholdID, "shoppingLists", shoppingListMeta.id, "items", currentItemForCost.id);
                  await updateDoc(itemRef, { isPurchased: true, cost: parseFloat(inputCost) });
                  setCostModalVisible(false);
                  setInputCost('');
                } catch (error) {
                  Alert.alert('Error', 'Failed to update item cost. Please try again.');
                  console.error(error);
                }
              }}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonWrapper2}
              onPress={() => {
                setCostModalVisible(false);
                setInputCost('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    marginTop: 10,
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
    height: '25%',
    minHeight: 275,
  },
  filterModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    height: '38%',
    borderRadius: 15,
    marginHorizontal: 20,
    marginVertical: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5, // Android shadow
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButtonContainer: {
    paddingLeft: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 5,
    marginTop: 10,
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
    borderRadius: 15,
    marginHorizontal: 20,
    marginVertical: 10,
    minHeight: '50%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4, // shadow for IOS
    elevation: 5, // shadow for android
  },
  noHouseholdsText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButtonWrapper: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
    marginRight: 5,
  },
  actionButtonWrapper2: {
    backgroundColor: '#FF6347',
    padding: 10,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});