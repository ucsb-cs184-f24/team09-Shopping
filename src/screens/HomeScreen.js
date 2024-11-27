import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, deleteDoc, query, where} from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import { updateBalancesAfterSplit } from './BalancesScreen'; 

// TODO (COMPLETE): remove items from list of respective household when user leaves group
// TODO (COMPLETE): do not allow split bill on checked off items
// TODO (COMPLETE): Only allow split bill if household has more than 1 user, implement cleaner UI i.e. button padding

export default function HomeScreen() {
  // Household states
  const [households, setHouseholds] = useState([]); // Array of household objects that user is part of
  const [selectedHouseholdID, setSelectedHouseholdID] = useState('');  // String of ID of selected household
  const [selectedHouseholdName, setSelectedHouseholdName] = useState(''); // Sting of name of selected household
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
  const [totalCost, setTotalCost] = useState(0);

  // Edit item states
  const [currentEditItem, setCurrentEditItem] = useState(null); // Object of item currently editing
  const [editItemName, setEditItemName] = useState('');  // String of new item name
  const [editItemCategory, setEditItemCategory] = useState(''); // String of edit item category
  const [editItemCost, setEditItemCost] = useState(''); // String of edit item cost
  const [selectedCategory, setSelectedCategory] = useState('');  // String of selected category

  // Modal states
  const [filterModalVisible, setFilterModalVisible] = useState(false); // Bool of modal visibility
  const [editModalVisible, setEditModalVisible] = useState(false); // Bool of modal visibility
  const [splitMembersModalVisible, setSplitMembersModalVisible] = useState(false); // Bool of modal visibility
  const [splitItemsModalVisible, setSplitItemsModalVisible] = useState(false); // Bool of modal visibility
  const [showCustomAmountModal, setShowCustomAmountModal] = useState(false)
  const [costModalVisible, setCostModalVisible] = useState(false); // Bool of modal visibility
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);

  // Dropdown picker states
  const [selectHouseHoldDropdown, setSelectHouseHoldDropdown] = useState(false);

  // Split bill states
  const [selectedMembers, setSelectedMembers] = useState([]); // Array of strings of household members IDs
  const [selectedItems, setSelectedItems] = useState([]); // Array of strings of items IDs
  const [currentItemForCost, setCurrentItemForCost] = useState(null);
  const [inputCost, setInputCost] = useState('');
  const [customAmounts, setCustomAmounts] = useState({});

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
        setSelectedHouseholdName(defaultHousehold.displayHouseholdName);
      }
      else {
        // If there are no households, clear the selected household
        setSelectedHouseholdID('');
        setSelectedHouseholdName('');
      }
    });

    return () => unsubscribe();
  }, []);

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
    if (!selectedHouseholdID | !shoppingListMeta) {
      setShoppingListItems([]);
      setCategories([]);
      return;
    }
  
    const q = collection(db, `households/${selectedHouseholdID}/shoppingLists/${shoppingListMeta.id}/items`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
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
    if (!selectedHouseholdID) {
      setHouseholdMembers([]);
      return;
    }
  
    const householdDocRef = doc(db, 'households', selectedHouseholdID);
  
    const unsubscribe = onSnapshot(householdDocRef, async (snapshot) => {
      const members = snapshot.data().members;
  
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
  
      // Update the state with filtered members info
      setHouseholdMembers(membersInfo.filter(info => info !== null));
    });
  
    // Cleanup listener when the component unmounts or household changes
    return () => unsubscribe();
  }, [selectedHouseholdID]);  

  // Add a new item to Firestore
  const addItemToList = async () => {
    if (!selectedHouseholdID) {
      Alert.alert('Error', 'Please select a household with an active shopping list before adding items.');
      return;
    }

    if (newItemName.trim() === '' || newItemCategory.trim() === '') {
      Alert.alert('Error', 'Please enter an item name and its category');
      return;
    }

    const newItemObj = {
      itemName: newItemName,
      category: newItemCategory,
      cost: newItemCost ? parseFloat(newItemCost) : 0,
      addedBy: auth.currentUser.email,
      isPurchased: false,
      addedDate: new Date(),
    };

    try {
      const itemsRef = collection(db, `households/${selectedHouseholdID}/shoppingLists/${shoppingListMeta.id}/items`);
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
      const itemRef = doc(db, `households/${selectedHouseholdID}/shoppingLists/${shoppingListMeta.id}/items/${itemId}`);

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
    const cost = editItemCost.trim() ? parseFloat(editItemCost) : 0;

    if (editItemCost.trim() && isNaN(cost)) {
      Alert.alert('Error', 'Please enter a valid number for the item cost.');
      return;
    }
    try {
      const itemRef = doc(db, "households", selectedHouseholdID, "shoppingLists", shoppingListMeta.id, "items", currentEditItem.id);
      await updateDoc(itemRef, { itemName: editItemName, category: editItemCategory, cost });

      setEditItemName('');
      setEditItemCategory('');
      setEditItemCost('');

      setEditModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      console.error(error);
    }
  };

  const splitBill = async () => {
    if (selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member to split the bill.');
      return;
    }
  
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to split.');
      return;
    }
  
    console.log('Selected Items for Splitting:', selectedItems);
  
    
    // Use full item objects to calculate total cost
    let calculatedCost = 0;

  // Use full item objects to calculate total cost
  selectedItems.forEach((item) => {
    const itemCost = item.cost !== undefined ? parseFloat(item.cost) : 0;
    console.log(`Item: ${item.itemName || item.id}, Cost: ${itemCost}`);
    calculatedCost += itemCost;
  });

  setTotalCost(calculatedCost);

  console.log('Total Cost:', totalCost);
  const splitAmount = parseFloat((totalCost / (selectedMembers.length + 1)).toFixed(2));
  console.log('Split Amount:', splitAmount);
  
    // Initialize customAmounts with default splitAmount
    const currentUser = getCurrentUser(); // Replace with your method to get the current user
    const allMembers = [...selectedMembers, currentUser];
  
    const initialCustomAmounts = {};
    allMembers.forEach((member) => {
      initialCustomAmounts[member.id] = splitAmount;
    });
  
    setCustomAmounts(initialCustomAmounts);
  
    // Show modal to assign custom amounts
    setShowCustomAmountModal(true);
  };
  
  // Function to proceed with splitting the bill after custom amounts are set
  const proceedWithSplitBill = async (totalCost) => {
    try {
      console.log("Function updated");
      await updateBalancesAfterSplit(selectedHouseholdID, customAmounts, selectedItems);

      console.log("Function updated");
      // Remove split items from the list after they are split
      for (const item of selectedItems) {
        await deleteItem(item.id);
        console.log("Deleting item");
      }
  
      // Clear selected items and members after split to prevent them from being reused
      setSelectedItems([]);
      console.log("Clear selected items");
      setSelectedMembers([]);
      setCustomAmounts({});
    } catch (error) {
      console.error('Error updating balances:', error);
      Alert.alert('Error', 'Failed to record the split.');
    }
  };
  
  const toggleItemSelection = (item) => {
    setSelectedItems((prevSelected) => {
      const isSelected = prevSelected.find((selectedItem) => selectedItem.id === item.id);
      if (isSelected) {
        // Remove item from split selection
        return prevSelected.filter((selectedItem) => selectedItem.id !== item.id);
      } else {
        // Add item to split selection
        return [...prevSelected, item];
      }
    });
  };

  // Function to toggle the purchased status of an item
  const togglePurchased = async (itemId, currentStatus, item) => {
    if (!currentStatus) {
      setCurrentItemForCost(item);
      setCostModalVisible(true);
    } else {
      try {
        const itemRef = doc(db, "households", selectedHouseholdID, "shoppingLists", shoppingListMeta.id, "items", itemId);
        await updateDoc(itemRef, {
          isPurchased: !currentStatus,
          purchasedDate: !currentStatus ? new Date() : null, // Add or clear purchasedDate
        });  
      } catch (error) {
        Alert.alert('Error', 'Failed to update item status. Please try again.');
        console.error(error);
      }
    }
  };

  const selectHousehold = (householdId) => {    
    // Find the name of the selected household
    const household = households.find(h => h.id === householdId);
    if (household) {
      setSelectedHouseholdName(household.displayHouseholdName);
    }
  };

  return (
    <View style={styles.container}>      
      <DropDownPicker
        open={selectHouseHoldDropdown}
        value={selectedHouseholdID}
        items={households.map(household => ({
          label: household.displayHouseholdName,
          value: household.id,
        }))}
        setOpen={setSelectHouseHoldDropdown}
        setValue={setSelectedHouseholdID}
        placeholder="Select a Household"
        onChangeValue={(value) => {
          if (value) {
            selectHousehold(value);
          }
        }}
        style={styles.dropdown}
        textStyle={styles.dropdownText}
        dropDownContainerStyle={styles.dropdownContainer}
        placeholderStyle={styles.dropdownPlaceholder}
      />

      <View style={styles.shoppingListContainer}>
        <View style={styles.shoppingListHeader}>
          <Text style={styles.shoppingListTitle}>Shopping List</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddItemModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+ Add Item</Text>
            </TouchableOpacity>

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
                  setSplitMembersModalVisible(true);
                }
              }}
            >
              <Text style={styles.splitButtonText}>Split</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
              <Ionicons name="options-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

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
                    <Text style={styles.buttonText}>Edit</Text>
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
      </View>

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
              <View style={{ paddingBottom: 13 }}> {/* TEMPORARY FIX */}
                <Button title="Close" onPress={() => setSplitMembersModalVisible(false)} />
              </View>
            </View>
  
            <FlatList
              data={householdMembers.filter((member) => member.uid !== auth.currentUser.uid)}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    padding: 10,
                    backgroundColor: selectedMembers.includes(item.uid) ? '#007BFF' : '#fff',
                    borderRadius: 4,
                    marginBottom: 5,
                  }}
                  onPress={() => {
                    setSelectedMembers((prevSelected) =>
                      prevSelected.includes(item.uid)
                        ? prevSelected.filter((member) => member !== item.uid)
                        : [...prevSelected, item.uid]
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.memberText,
                      selectedMembers.includes(item.uid) && styles.memberTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
  
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => {
                if (selectedMembers.length === 0) {
                  Alert.alert('Error', 'Please select at least one member.');
                } else {
                  setSplitItemsModalVisible(true);
                }
              }}
            >
              <Text style={styles.nextButtonText}>Next: Select Items</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={addItemModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddItemModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.addItemModalContent}>
            <Text style={styles.modalTitle}>Add A New Item</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              placeholderTextColor="#aaa"
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter item category"
              placeholderTextColor="#aaa"
              value={newItemCategory}
              onChangeText={setNewItemCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter item cost (Optional)"
              placeholderTextColor="#aaa"
              value={newItemCost}
              onChangeText={setNewItemCost}
              keyboardType="numeric"
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.actionButtonWrapper}
                onPress={() => {
                  addItemToList();
                  setAddItemModalVisible(false);
                }}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButtonWrapper2}
                onPress={() => {
                  setAddItemModalVisible(false);
                  setNewItemName('');
                  setNewItemCategory('');
                  setNewItemCost('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for selecting items to split */}
      <Modal
        visible={splitItemsModalVisible}
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
  
            <FlatList
              data={shoppingListItems.filter((item) => item.isPurchased)}
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
                    setSelectedItems((prevSelected) =>
                      prevSelected.includes(item.id)
                        ? prevSelected.filter((i) => i !== item.id)
                        : [...prevSelected, item.id]
                    ), toggleItemSelection(item);
                  }}
                >
                  <Text style={{ color: selectedItems.includes(item.id) ? '#fff' : '#000' }}>
                    {item.itemName} - ${item.cost}
                  </Text>
                </TouchableOpacity>
              )}
            />
  
            <Button
              title="Next: Assign Custom Amounts"
              onPress={() => {
                if (selectedItems.length === 0) {
                  Alert.alert('Error', 'Please select at least one item.');
                } else {
                  splitBill(); // Initializes customAmounts and shows the custom amount modal
                  setShowCustomAmountModal(true);
                }
              }}
            />
          </View>
        </View>
      </Modal>
  
      {/* Modal for assigning custom amounts */}
      <Modal
          animationType="slide"
          transparent={true}
          visible={showCustomAmountModal}
          onRequestClose={() => {
            setShowCustomAmountModal(false);
          }}
        >
          <View style={styles.modalContainer}>
          <View style={styles.splitModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Custom Amount</Text>
              <Button title="Close" onPress={() => setShowCustomAmountModal(false)} />
            </View>
  
            <FlatList
              data={[...selectedMembers, auth.currentUser.uid]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const memberName =
                  householdMembers.find((member) => member.uid === item)?.name || 'You';
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ flex: 1 }}>{memberName}</Text>
                    <TextInput
                      style={{ borderWidth: 1, padding: 5, width: 100 }}
                      keyboardType="numeric"
                      value={customAmounts[item] || ''}
                      onChangeText={(value) => {
                        const newAmounts = { ...customAmounts };
                        newAmounts[item] = value; // Store raw input
                        setCustomAmounts(newAmounts);
                      }}
                    />
                  </View>
                );
              }}
            />
  
            <Button
              title="Confirm Split"
              onPress={() => {
                const parsedAmounts = {};
                let invalidInput = false;
                Object.keys(customAmounts).forEach((key) => {
                const amount = parseFloat(customAmounts[key]);
                  if (isNaN(amount)) {
                    Alert.alert('Error', 'Please enter valid numeric amounts.');
                    return;
                  } else {
                    parsedAmounts[key] = amount;
                  }
                });
                const totalAssigned = Object.values(parsedAmounts).reduce(
                  (sum, amount) => sum + amount,
                  0
                );
            
                // Check if the total assigned matches the total cost
                if (Math.abs(totalAssigned - totalCost) > 0.01) {
                  // Show an error if the amounts don't match
                  Alert.alert(
                    'Error',
                    `The assigned amounts (${totalAssigned.toFixed(2)}) must equal the total cost (${totalCost.toFixed(2)}).`
                  );
                } else {
                  setShowCustomAmountModal(false);
                  proceedWithSplitBill(totalCost);
                }
                
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
          <Text style={styles.modalTitle}>
            {currentEditItem ? `Editing: ${currentEditItem.itemName}` : "Editing..."}
          </Text>

            <TextInput
              style={styles.input}
              placeholder="Edit item name"
              placeholderTextColor="#aaa"
              value={editItemName}
              onChangeText={setEditItemName}
            />
  
            <TextInput
              style={styles.input}
              placeholder="Edit category"
              placeholderTextColor="#aaa"
              value={editItemCategory}
              onChangeText={setEditItemCategory}
            />
  
            <TextInput
              style={styles.input}
              placeholder="Edit cost"
              placeholderTextColor="#aaa"
              value={editItemCost}
              onChangeText={setEditItemCost}
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.actionButtonWrapper}
                onPress={() => {
                  saveEdit
                }}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButtonWrapper2}
                onPress={() => {
                  setEditModalVisible(false)
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
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
              <Picker.Item label="No Filter" value="" color="#000" />
              {categories.map((category, index) => (
                <Picker.Item key={index} label={category} value={category} color="#000" />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>

      {/* Modal for cost */}
      <Modal
        visible={costModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCostModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.costModalContent}>
            <Text style={styles.modalTitle}>Enter Item Cost</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter item cost"
              placeholderTextColor="#aaa"
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
  // Main Container
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 55,
    backgroundColor: '#fff',
    width: '100%',
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    marginTop: 10,
  },
  splitButton: {
    alignSelf: 'center',
    backgroundColor: '#008F7A',
    padding: 10,
    borderRadius: 4,
    marginBottom: 0,
  },
  splitButtonText: {
    fontFamily: "Avenir",
    color: '#fff',
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addButton: {
    alignSelf: 'center',
    backgroundColor: '#008F7A',
    padding: 10,
    borderRadius: 4,
    marginBottom: 0,
  },
  addButtonText: {
    fontFamily: "Avenir",
    color: '#fff',
    padding: 0,
    borderRadius: 8,
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
  filterButton: {
    backgroundColor: "#6C757D",
    padding: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Input Fields
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 6,
    borderRadius: 5,
    width: '90%',
    alignSelf: 'center',
    fontFamily: "Avenir",
  },

  // Shopping List Container
  shoppingListContainer: {
    width: "100%",
    height: '90%',
    backgroundColor: "#ECECEC",
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginVertical: 10,
  },
  subtitleContainer: {
    marginBottm: 20,
    alignItems: 'flex-start',  
  },
  shoppingListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15, // Space between header and list
  },
  shoppingListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Avenir",
    color: "#333",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4, // Space between buttons
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f9f9f9',
    marginBottom: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flexDirection: 'column',
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontFamily: "Avenir",
    fontWeight: 'bold',
  },
  addedByText: {
    fontFamily: "Avenir",
    color: 'gray',
  },
  purchasedText: {
    fontFamily: "Avenir",
    color: 'gray',
    textDecorationLine: 'line-through',
  },
  radioButton: {
    padding: 5,
  },
  
  // Modal Styles
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
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  costModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addItemModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: "Avenir",
    marginBottom: 10,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
  },
  actionButtonWrapper: { // Households exist
    backgroundColor: "#008F7A",
    flexDirection:'row',
    padding: 11,
    borderRadius: 8,
  },
  actionButtonWrapper2: {
    backgroundColor: "#DF0808",
    flexDirection:'row',
    padding: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Dropdown
  dropdown: {
    width: '100%',
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownPlaceholder: {
    fontFamily: "Avenir",
    fontSize: 18,
    color: '#aaa',
  },
  dropdownText: {
    fontFamily: "Avenir",
    fontSize: 18,
    color: '#333',
  },
  dropdownContainer: {
    borderColor: '#ddd',
    borderRadius: 8,
  },
  
  // Picker
  picker: {
    height: 150,
    width: '100%',
  },

  // Split the Bill
  memberText: {
    fontSize: 16,  // Adjust font size
    fontFamily: 'Avenir', // Adjust font family
    fontWeight: '500', // Adjust font weight
    color: '#000', // Default color for unselected
  },
  memberTextSelected: {
    color: '#fff', // Color for selected members
  },
  nextButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },

  nextButtonText: {
    fontFamily: 'Avenir', // Font family
    fontSize: 16,         // Font size
    fontWeight: 'bold',   // Font weight
    color: '#007BFF',        // Text color
  },
});