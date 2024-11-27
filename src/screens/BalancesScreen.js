import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Button } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
// Function to update balances after splitting the bill
export const updateBalancesAfterSplit = async (selectedHouseholdID, customAmounts, itemsDetails) => { 
  try {
    const userId = auth.currentUser.uid;

    for (const [memberId, amount] of Object.entries(customAmounts)) {
      
      if (memberId !== userId) {
        console.log("Member Id is " + memberId + " " + amount + "\n");
        // Create a new document for each transaction
        const newTransactionRef = doc(collection(db, `households/${selectedHouseholdID}/balances`));
        await setDoc(newTransactionRef, {
          owedBy: memberId,
          owedTo: userId,
          amount: amount,
          repaymentAmount: 0, // initalize repayment amount to 0
          repayments: [],
          itemsDetails: itemsDetails,
          type: 'item',
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
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [payTo, setPayTo] = useState('');
  const [payToItems, setPayToItems] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [balances, setBalances] = useState([]);
  const [netBalances, setNetBalances] = useState([]);
  const [householdMembersCount, setHouseholdMembersCount] = useState(1);
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
          const userHouseholds = snapshot.docs.map((doc) => {
            const householdData = doc.data();
            const members = householdData.members || []; // Ensure members is always an array
            setHouseholdMembersCount(members.length);
            return {
              id: doc.id,
              ...householdData,
              memberCount: members.length, // Add member count here
            };
          });
  
          setHouseholds(userHouseholds);
  
          // Update household items for dropdown
          setHouseholdItems(userHouseholds.map((household) => ({
            label: household.displayHouseholdName
              ? household.displayHouseholdName
              : `Household ${household.id.substring(0, 6)}`, // Default label
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
  

  useEffect(() => {
    const fetchMembers = async () => {
      if (selectedHouseholdId) {
        try {
          const householdDocRef = doc(db, 'households', selectedHouseholdId);
          const householdDoc = await getDoc(householdDocRef);
          const members = householdDoc.data().members;

          // only show other members in household
          const currentUserId = auth.currentUser.uid;
          const filteredMembers = members.filter((uid) => uid != currentUserId);

          const membersInfo = await Promise.all(
            filteredMembers.map(async (uid) => {
              try {
                const userDocRef = doc(db, 'users', uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                  return { label: userDoc.data().name, value: uid };
                }
              } catch (error) {
                console.error(`Failed to fetch user: ${uid}`, error);
              }
              return null;
            })
          );

          setPayToItems(membersInfo.filter((info) => info != null));
        } catch (error) {
          console.error('Error fetching household members:', error);
        }
      }
    };

    fetchMembers();
  }, [selectedHouseholdId])



  const calculateNetBalances = async (balancesData) => {
    const netBalanceMap = {};
  
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
  
    const householdMembers = membersInfo.filter((info) => info !== null);
  
    // Calculate raw net balances
    balancesData.forEach((balance) => {
      const { owedBy, owedTo, amount = 0, repaymentAmount = 0 } = balance;
  
      if (!netBalanceMap[owedBy]) netBalanceMap[owedBy] = {};
      if (!netBalanceMap[owedTo]) netBalanceMap[owedTo] = {};
  
      if (!netBalanceMap[owedBy][owedTo]) {
        netBalanceMap[owedBy][owedTo] = 0;
      }
  
      // Add the remaining debt (amount - repaymentAmount) to the map
      netBalanceMap[owedBy][owedTo] += amount - repaymentAmount;
    });
  
    // Adjust balances to account for mutual debts
    const netBalancesList = [];
    for (const owedBy in netBalanceMap) {
      for (const owedTo in netBalanceMap[owedBy]) {
        if (netBalanceMap[owedBy][owedTo] > 0) {
          const mutualAmount = netBalanceMap[owedTo]?.[owedBy] || 0;
          const finalAmount = netBalanceMap[owedBy][owedTo] - mutualAmount;
  
          if (finalAmount > 0) {
            netBalancesList.push({
              owedBy,
              owedTo,
              owedByUsername:
                householdMembers.find((member) => member.uid === owedBy)?.name || owedBy,
              owedToUsername:
                householdMembers.find((member) => member.uid === owedTo)?.name || owedTo,
              amount: finalAmount,
            });
          }
  
          // Update BOTH directions of debt to reflect adjustment
          netBalanceMap[owedBy][owedTo] = finalAmount > 0 ? finalAmount : 0;
          if (netBalanceMap[owedTo]) {
            netBalanceMap[owedTo][owedBy] = mutualAmount > netBalanceMap[owedBy][owedTo]
              ? mutualAmount - netBalanceMap[owedBy][owedTo]
              : 0;
          }
        }
      }
    }
  
    setNetBalances(netBalancesList);
  };

  const normalizeFloat = (value, precision = 2) => {
    return parseFloat(value.toFixed(precision));
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
  
    if (!payTo) {
      Alert.alert('Error', 'Please select a person to pay.');
      return;
    }
  
    try {
      const userId = auth.currentUser.uid;
      const paymentAmountValue = normalizeFloat(parseFloat(paymentAmount));
  
      const balancesRef = query(
        collection(db, `households/${selectedHouseholdId}/balances`),
        where('owedBy', '==', userId),
        where('owedTo', '==', payTo)
      );
  
      const balancesSnapshot = await getDocs(balancesRef);
  
      if (balancesSnapshot.empty) {
        Alert.alert('Error', 'No debt found between you and the selected person.');
        return;
      }
  
      let totalRemainingDebt = 0;
      const balances = [];
  
      // Calculate total debt and collect balance data
      balancesSnapshot.docs.forEach((doc) => {
        const balanceData = doc.data();
        totalRemainingDebt = normalizeFloat(
          totalRemainingDebt + (balanceData.amount || 0) - (balanceData.repaymentAmount || 0)
        );
        balances.push({ ...balanceData, id: doc.id, ref: doc.ref });
      });
  
      if (totalRemainingDebt === 0) {
        Alert.alert('Warning', 'You do not owe any money to the selected person.');
        return;
      }
  
      if (paymentAmountValue > totalRemainingDebt) {
        Alert.alert('Overpayment Warning', `You are overpaying by $${normalizeFloat(paymentAmountValue - totalRemainingDebt)}. Please modify your payment amount.`);
        return;
      }
  
      // Sort balances in ascending order based on amount
      balances.sort((a, b) => a.amount - b.amount);
  
      let remainingPayment = paymentAmountValue;
  
      // Apply repayments to balances
      for (let i = 0; i < balances.length && remainingPayment > 0; ++i) {
        const balance = balances[i];
        const { amount, repaymentAmount = 0, repayments = [] } = balance;
        const docRef = balance.ref;
  
        const newRepaymentAmount = normalizeFloat(repaymentAmount + remainingPayment);
  
        if (newRepaymentAmount >= amount) {
          // Settle debt completely
          await updateDoc(docRef, {
            repaymentAmount: amount,
            status: 'settled',
            repayments: [
              ...repayments,
              { amount: remainingPayment, date: new Date().toISOString() }, // Add repayment record
            ],
            lastUpdated: serverTimestamp(),
          });
          remainingPayment = normalizeFloat(newRepaymentAmount - amount);
        } else {
          // Partially reduce this debt
          await updateDoc(docRef, {
            repaymentAmount: newRepaymentAmount,
            repayments: [
              ...repayments,
              { amount: remainingPayment, date: new Date().toISOString() }, // Add repayment record
            ],
            lastUpdated: serverTimestamp(),
          });
          remainingPayment = 0;
        }
      }
  
      Alert.alert('Success', 'Payment recorded successfully!');
      setIsPaymentModalVisible(false);
      setPaymentAmount('');
      setPayTo('');
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment. Please try again.');
    }
  };
  

  
  // Fetch balance details whenever selected household changes






  useEffect(() => {
    if (selectedHouseholdId) {
      const balancesRef = query(
        collection(db, `households/${selectedHouseholdId}/balances`),
        orderBy('createdAt', 'desc')
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
  
          const householdMembers = membersInfo.filter((info) => info !== null);
  
          // Map balances and calculate remaining amounts
          const balancesData = balancesSnapshot.docs.map((doc) => {
            const balance = doc.data();
            const remainingAmount = normalizeFloat((balance.amount || 0) - (balance.repaymentAmount || 0));
            return {
              id: doc.id,
              owedBy: balance.owedBy,
              owedTo: balance.owedTo,
              owedByUsername:
                householdMembers.find((member) => member.uid === balance.owedBy)?.name || balance.owedBy,
              owedToUsername:
                householdMembers.find((member) => member.uid === balance.owedTo)?.name || balance.owedTo,
              remainingAmount,
              itemDetails: balance.itemsDetails || [],
              repayments: balance.repayments || [], // Include repayments array
              createdAt: balance.createdAt,
              status: balance.status || 'active',
            };
          });
  
          // Map each item separately to create individual transactions
          let transactions = balancesData.flatMap((balance) => {
            const itemDetailsArray = balance.itemDetails.filter((item) => item.itemName && item.cost > 0);
  
            // Map item transactions
            const itemTransactions = itemDetailsArray.map((item) => ({
              id: `${balance.id}-${item.itemName}`, // Unique ID for each item transaction
              type: 'item',
              owedBy: balance.owedBy,
              owedTo: balance.owedTo,
              owedByUsername: balance.owedByUsername,
              owedToUsername: balance.owedToUsername,
              itemName: item.itemName,
              amount: item.cost,
              createdAt: balance.createdAt,
            }));
  
            // Map repayment transactions
            const repaymentTransactions = balance.repayments.map((repayment, index) => ({
              id: `${balance.id}-repayment-${index}`, // Unique ID for each repayment transaction
              type: 'repayment',
              owedBy: balance.owedBy,
              owedTo: balance.owedTo,
              owedByUsername: balance.owedByUsername,
              owedToUsername: balance.owedToUsername,
              amount: repayment.amount,
              createdAt: repayment.date,
            }));
  
            // Include the overall balance with remaining amount
            const balanceTransaction = {
              id: balance.id,
              type: 'balance',
              owedBy: balance.owedBy,
              owedTo: balance.owedTo,
              owedByUsername: balance.owedByUsername,
              owedToUsername: balance.owedToUsername,
              remainingAmount: balance.remainingAmount,
              createdAt: balance.createdAt,
            };
  
            return [...itemTransactions, ...repaymentTransactions, balanceTransaction];
          });

          transactions = transactions.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
  
          setTransactions(transactions);
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
  
      {/* Net Balances Section */}
      {netBalances.length > 0 ? (
        <View style={styles.netBalancesContainer}>
          {netBalances.map((balance, index) => (
            <Text key={index} style={styles.netBalanceText}>
              {balance.owedByUsername} owes {balance.owedToUsername}: $
              {(balance.amount - (balance.repaymentAmount || 0)).toFixed(2)}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.noDebtMessage}>All debts are settled!</Text>
      )}
  
      {/* Balances List */}
      {selectedHouseholdId ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            // Handle repayment transactions
            if (item.type === 'repayment') {
              return (
                <View style={[styles.transactionCard, styles.repaymentTransaction]}>
                  <Text style={styles.transactionDescription}>
                    Repayment of ${item.amount.toFixed(2)} from {item.owedByUsername} to {item.owedToUsername}
                  </Text>
                  <Text style={styles.transactionDate}>
                    Date: {item.createdAt
                      ? item.createdAt instanceof Date
                        ? `${item.createdAt.toLocaleDateString('en-US')} ${item.createdAt.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}` 
                        : typeof item.createdAt.toDate === 'function'
                        ? `${item.createdAt.toDate().toLocaleDateString('en-US')} ${item.createdAt.toDate().toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}`
                        : `${new Date(item.createdAt).toLocaleDateString('en-US')} ${new Date(item.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}`
                      : 'Unknown date'}
                  </Text>
                </View>
              );
            }
  
            // Handle item transactions
            if (item.type === 'item') {
              return (
                <View
                  style={[
                    styles.transactionCard,
                    item.owedBy === auth.currentUser.uid ? styles.splitTransaction : styles.receivedTransaction,
                  ]}
                >
                  <Text style={styles.transactionDescription}>
                    {item.itemName ? `${item.itemName}: $${item.amount.toFixed(2)}` : 'No details available'}
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
                      item.owedBy === auth.currentUser.uid ? styles.negativeAmount : styles.positiveAmount,
                    ]}
                  >
                    {item.amount !== undefined && !isNaN(item.amount)
                      ? item.owedBy === auth.currentUser.uid
                        ? `-$${(Math.abs(parseFloat(item.amount)) / householdMembersCount).toFixed(2)}`
                        : `+$${(parseFloat(item.amount) / householdMembersCount).toFixed(2)}`
                      : '$0.00'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    Date: {item.createdAt
                      ? item.createdAt instanceof Date
                        ? `${item.createdAt.toLocaleDateString('en-US')} ${item.createdAt.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}`
                        : typeof item.createdAt.toDate === 'function'
                        ? `${item.createdAt.toDate().toLocaleDateString('en-US')} ${item.createdAt.toDate().toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}`
                        : `${new Date(item.createdAt).toLocaleDateString('en-US')} ${new Date(item.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}`
                      : 'Unknown date'}
                  </Text>
                </View>
              );
            }
  
            return null;
          }}
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
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.payButton} onPress={handleRecordPayment}>
                  <Text style={styles.buttonText}>Pay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsPaymentModalVisible(false)}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
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
    fontFamily: "Avenir",
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
    fontFamily: "Avenir",
    color: '#333',
  },
  itemsDetailsContainer: {
    marginTop: 5,
  },
  itemDetailText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    fontFamily: "Avenir",
  },
  noHouseholdSelectedText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginVertical: 30,
  },
  recordPaymentButton: {
    alignSelf: 'center',
    backgroundColor: '#008F7A',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  payButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginRight: 10, // Add spacing between buttons
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF5252',
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginLeft: 10, // Add spacing between buttons
    alignItems: 'center',
  },
  
});