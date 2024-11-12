import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Button } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

// Function to update balances after splitting the bill
export const updateBalancesAfterSplit = async (selectedHouseholdID, selectedMembers, splitAmount, itemsDetails) => {
  try {
    const userId = auth.currentUser.uid;
    for (let member of selectedMembers) {
      if (member !== userId) {
        // Create a new document for each transaction instead of updating existing one
        const newTransactionRef = doc(collection(db, `households/${selectedHouseholdID}/balances`));
        await setDoc(newTransactionRef, {
          owedBy: member,
          owedTo: userId,
          amount: splitAmount,
          itemsDetails: itemsDetails,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error('Error updating balances after split:', error);
    throw new Error('Failed to update balances after split');
  }
};


// Main BalancesScreen component
export default function BalancesScreen() {
  const [households, setHouseholds] = useState([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [owedDetails, setOwedDetails] = useState([]);
  const [householdItems, setHouseholdItems] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [payTo, setPayTo] = useState('');
  const [payToItems, setPayToItems] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [balances, setBalances] = useState([]);
    const [netBalances, setNetBalances] = useState([]);



  useEffect(() => {
    if (selectedHouseholdId) {
      const balancesRef = collection(db, `households/${selectedHouseholdId}/balances`);
      const unsubscribe = onSnapshot(balancesRef, (snapshot) => {
        const balancesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBalances(balancesData);
        calculateNetBalances(balancesData);
      });
  
      return () => unsubscribe();
    }
  }, [selectedHouseholdId]);
  


  // Fetch households associated with the user
  useEffect(() => {
    const fetchHouseholds = async () => {
      try {
        const userId = auth.currentUser.uid;
        const q = query(collection(db, 'households'), where('members', 'array-contains', userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const userHouseholds = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setHouseholds(userHouseholds);
          setHouseholdItems(userHouseholds.map((household) => ({
            label: household.displayHouseholdName || 'Unnamed Household',
            value: household.id,
          })));
        });
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching households:', error);
      }
    };

    fetchHouseholds();
  }, []);



  const calculateNetBalances = (balancesData) => {
    const netBalanceMap = {};
    balancesData.forEach((balance) => {
      const { owedBy, owedTo, amount } = balance;
      if (!netBalanceMap[owedBy]) netBalanceMap[owedBy] = {};
      if (!netBalanceMap[owedTo]) netBalanceMap[owedTo] = {};
      

      // Owed by owedBy to owedTo
      if (!netBalanceMap[owedBy][owedTo]) {
        netBalanceMap[owedBy][owedTo] = 0;
      }
      netBalanceMap[owedBy][owedTo] += amount;
    });

    const netBalancesList = [];
    for (const owedBy in netBalanceMap) {
      for (const owedTo in netBalanceMap[owedBy]) {
        if (netBalanceMap[owedBy][owedTo] > 0) {
          netBalancesList.push({
            owedBy,
            owedTo,
            amount: netBalanceMap[owedBy][owedTo],
          });
        }
      }
    }
    setNetBalances(netBalancesList);
  };

  // Fetch balance details whenever selected household changes
// Fetch balance details whenever selected household changes
useEffect(() => {
  if (selectedHouseholdId) {
    const balancesRef = query(
      collection(db, `households/${selectedHouseholdId}/balances`),
      orderBy('createdAt', 'desc') // Order by createdAt field in descending order (newest first)
    );
    const unsubscribe = onSnapshot(balancesRef, async (balancesSnapshot) => {
      try {
        // Fetch household members details to get usernames
        const householdDocRef = doc(db, 'households', selectedHouseholdId);
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
            } catch (error) {
              console.error(`Failed to fetch user with UID: ${uid}`, error);
            }
            return null;
          })
        );

        const householdMembers = membersInfo.filter(info => info !== null);

        // Map balances to include owedByUsername and owedToUsername
        const balancesData = balancesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTransactions(
          balancesData.map((balance) => {
            // Map through itemsDetails to extract item name and cost
            const itemDetailsArray = balance.itemsDetails && Array.isArray(balance.itemsDetails)
              ? balance.itemsDetails.map((item) => ({
                  name: item.itemName || 'Unnamed Item',
                  cost: item.cost || 0, // Use `amount` or `cost`
                }))
              : [];

            return {
              ...balance,
              owedByUsername:
                householdMembers.find((member) => member.uid === balance.owedBy)?.name || balance.owedBy,
              owedToUsername:
                householdMembers.find((member) => member.uid === balance.owedTo)?.name || balance.owedTo,
              itemsDetails: itemDetailsArray,
            };
          })
        );
      } catch (error) {
        console.error('Error fetching household or balances:', error);
      }
    });

    return () => unsubscribe();
  }
}, [selectedHouseholdId, households]);









  return (
    <View style={styles.container}>
      {/* Header Section */}
      <Text style={styles.title}>Household Balances</Text>
      
      {/* Dropdown for selecting household */}
      <DropDownPicker
        open={isDropdownOpen}
        value={selectedHouseholdId}
        items={householdItems}
        setOpen={setIsDropdownOpen}
        setValue={setSelectedHouseholdId}
        setItems={setHouseholdItems}
        placeholder="Select Household"
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        listMode="SCROLLVIEW"
      />


            {/* Net Balances Summary */}
            {netBalances.length > 0 && (
              <View style={styles.netBalancesContainer}>
                {netBalances.map((balance, index) => (
                  <Text key={index} style={styles.netBalanceText}>
                    {balance.owedBy} owes {balance.owedTo}: ${balance.amount.toFixed(2)}
                  </Text>
                ))}
              </View>
            )}

  
      {/* Balances List */}
      {selectedHouseholdId ? (
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.transactionCard,
              item.owedBy === auth.currentUser.uid ? styles.splitTransaction : styles.receivedTransaction, // Red border for split, green for received
            ]}
          >
            <Text style={styles.transactionDescription}>
              {/* Display each item name and cost */}
              {item.itemsDetails && item.itemsDetails.length > 0
                ? item.itemsDetails.map((detail, index) => `${detail.name}: $${detail.cost}`).join(', ')
                : 'No details available'}
            </Text>
            <Text style={styles.transactionPayer}>
              Paid by: {item.owedByUsername || 'Unknown'}
            </Text>
            <Text style={styles.transactionPayee}>
              Owed to: {item.owedToUsername || 'Unknown'}
            </Text>
            <Text
              style={[
                styles.transactionAmount,
                item.owedBy === auth.currentUser.uid ? styles.negativeAmount : styles.positiveAmount, // Negative red for owed, positive green for received
              ]}
            >
              {item.owedBy === auth.currentUser.uid
                ? `-$${Math.abs(item.amount).toFixed(2)}`
                : `+$${item.amount.toFixed(2)}`}
            </Text>
            <Text style={styles.transactionDate}>
              Date: {item.createdAt 
                ? `${item.createdAt.toDate().toLocaleDateString('en-US')} ${item.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                : 'Unknown date'}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.transactionContainer}
      />
      
          
    
    

      
    
    
      
      ) : (
        <Text style={styles.noHouseholdSelectedText}>Please select a household to view balances.</Text>
      )}
  
      {/* Record Payment Button */}
      <TouchableOpacity style={styles.recordPaymentButton} onPress={() => setIsPaymentModalVisible(true)}>
        <Text style={styles.recordPaymentButtonText}>Record Payment</Text>
      </TouchableOpacity>
  
      {/* Record Payment Modal */}
      {isPaymentModalVisible && (
        <Modal visible={isPaymentModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Record a Payment</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={(text) => setPaymentAmount(text)}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter description"
                value={paymentDescription}
                onChangeText={(text) => setPaymentDescription(text)}
              />
              <DropDownPicker
                open={isDropdownOpen}
                value={payTo}
                items={payToItems}
                setOpen={setIsDropdownOpen}
                setValue={setPayTo}
                setItems={setPayToItems}
                placeholder="Select person to pay"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                listMode="SCROLLVIEW"
              />
              <Button title="Record Payment" onPress={handleRecordPayment} />
              <Button title="Cancel" color="red" onPress={() => setIsPaymentModalVisible(false)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#003366',
    marginBottom: 20,
  },
  dropdown: {
    borderColor: '#ccc',
    height: 50,
    marginBottom: 20,
  },
  dropdownContainer: {
    borderColor: '#ccc',
    borderRadius: 8,
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#ffffff',
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
  itemName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  itemsDetailsContainer: {
    marginTop: 5,
  },
  itemDetailText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  noHouseholdSelectedText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginVertical: 30,
  },
  recordPaymentButton: {
    alignSelf: 'center',
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 8,
  },
  recordPaymentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
    width: '114%', // Set a narrower width, adjustable as needed
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8, // Slightly rounded corners for a more rectangular shape
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 5,
    elevation: 2,
    borderLeftWidth: 6,
    alignSelf: 'center',
    borderLeftColor: '#4CAF50', // Green for positive balances, adjustable based on context
  },
  splitTransaction: {
    borderLeftColor: '#d9534f', // Red color for split transactions
  },
  receivedTransaction: {
    borderLeftColor: '#4CAF50', // Green color for received transactions
  },
  transactionDescription: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionPayer: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    marginBottom: 3,
  },
  transactionPayee: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    marginBottom: 3,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 6,
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
    textAlign: 'right',
  },
  transactionContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  negativeAmount: {
    color: '#d9534f', // Red color for negative values
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  footer: {
    position: 'absolute', // Sticks the footer to a fixed position
    bottom: 0, // Keeps the button at the bottom with some margin from the bottom edge
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  netBalanceText: {
    fontSize: 14,
    color: '#003366',
    fontWeight: '600',
    marginBottom: 5,
  },


  
});

