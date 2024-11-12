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
        // Reference the balance document
        const balanceRef = doc(db, `households/${selectedHouseholdID}/balances`, `${member}_${userId}`);
        const balanceDoc = await getDoc(balanceRef);

        let newAmount = splitAmount;
        let updatedItemsDetails = itemsDetails;

        if (balanceDoc.exists()) {
          // Append to the existing amount and merge item details
          newAmount += balanceDoc.data().amount;
          updatedItemsDetails = [...(balanceDoc.data().itemsDetails || []), ...itemsDetails];
        }

        // Update the Firestore document with new balance information
        await setDoc(balanceRef, {
          owedBy: member,
          owedTo: userId,
          amount: newAmount,
          itemsDetails: updatedItemsDetails,
          updatedAt: new Date(),
        }, { merge: true }); // Use { merge: true } to update fields without overwriting
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

  // Fetch balance details whenever selected household changes
  useEffect(() => {
    if (selectedHouseholdId) {
      const balancesRef = collection(db, `households/${selectedHouseholdId}/balances`);
      const unsubscribe = onSnapshot(balancesRef, (balancesSnapshot) => {
        const balancesData = balancesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOwedDetails(balancesData.map(balance => ({
          ...balance,
          owedByUsername: households.find(h => h.id === selectedHouseholdId)?.members.find(m => m === balance.owedBy)?.username || balance.owedBy,
          owedToUsername: households.find(h => h.id === selectedHouseholdId)?.members.find(m => m === balance.owedTo)?.username || balance.owedTo,
          itemsDetails: balance.itemsDetails || [], // Ensure itemsDetails are included
        })));
      });

      return () => unsubscribe();
    }
  }, [selectedHouseholdId, households]);

  // Record a payment
  const handleRecordPayment = () => {
    if (!paymentAmount || !payTo) {
      Alert.alert('Error', 'Please enter a valid amount and select a person to pay.');
      return;
    }

    setIsPaymentModalVisible(false);
    recordPayment();
  };

  const recordPayment = async () => {
    try {
      if (!selectedHouseholdId) {
        Alert.alert('Error', 'Please select a household first.');
        return;
      }

      const userId = auth.currentUser.uid;
      const paymentData = {
        description: paymentDescription || 'Payment recorded manually',
        paidBy: userId,
        amount: parseFloat(paymentAmount),
        paidTo: payTo,
        createdAt: serverTimestamp(),
      };

      const balanceRef = doc(db, `households/${selectedHouseholdId}/balances`, `${payTo}_${userId}`);
      const reverseBalanceRef = doc(db, `households/${selectedHouseholdId}/balances`, `${userId}_${payTo}`);

      const balanceDoc = await getDoc(balanceRef);
      const reverseBalanceDoc = await getDoc(reverseBalanceRef);

      if (balanceDoc.exists()) {
        const newAmount = balanceDoc.data().amount - paymentData.amount;
        if (newAmount < 0 && reverseBalanceDoc.exists()) {
          await updateDoc(reverseBalanceRef, {
            amount: reverseBalanceDoc.data().amount + paymentData.amount,
          });
        } else if (newAmount <= 0) {
          await deleteDoc(balanceRef);
        } else {
          await updateDoc(balanceRef, {
            amount: newAmount,
          });
        }
      } else {
        await setDoc(balanceRef, {
          owedBy: payTo,
          owedTo: userId,
          amount: paymentData.amount,
        });
      }

      await addDoc(collection(db, `households/${selectedHouseholdId}/transactions`), {
        ...paymentData,
        amount: paymentData.amount,
      });

      Alert.alert('Success', 'Payment recorded and balances updated successfully.');
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment.');
    }
  };

  // Settle up a specific balance
  const settleUp = async (owedBy, owedTo) => {
    try {
      if (!selectedHouseholdId) {
        Alert.alert('Error', 'Please select a household first.');
        return;
      }

      const balanceRef = doc(db, `households/${selectedHouseholdId}/balances`, `${owedBy}_${owedTo}`);
      await deleteDoc(balanceRef);

      Alert.alert('Success', 'Settlement recorded successfully.');
    } catch (error) {
      console.error('Error settling up:', error);
      Alert.alert('Error', 'Failed to settle up.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transactionCard}>
            <Text style={styles.transactionText}>{item.description || 'No description available'}</Text>
            <Text style={styles.paidByText}>Paid by: {item.paidByUsername || 'Unknown'}</Text>
            <Text style={item.amount < 0 ? styles.transactionAmountNegative : styles.transactionAmountPositive}>
              {item.amount < 0 ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
            </Text>
          </View>
        )}
        ListHeaderComponent={() => (
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Household Balances</Text>
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
            {owedDetails.length > 0 && (
              <View style={styles.owedSummary}>
                {owedDetails.map((detail, index) => (
                  <View key={index} style={styles.owedRow}>
                    <Text style={styles.owedText}>
                      {detail.owedByUsername || detail.owedBy} owes {detail.owedToUsername || detail.owedTo} ${detail.amount.toFixed(2)}
                    </Text>

                    {/* Display the item details if they exist */}
                    {detail.itemsDetails && detail.itemsDetails.length > 0 && (
                      <View style={styles.itemsDetailsContainer}>
                        {detail.itemsDetails.map((itemDetail, itemIndex) => (
                          <Text key={itemIndex} style={styles.itemDetailText}>
                            - {itemDetail.itemName}: ${itemDetail.cost}
                          </Text>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity onPress={() => settleUp(detail.owedBy, detail.owedTo)}>
                      <Text style={styles.settleUpButton}>Settle Up</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.subtitle}>Transaction History</Text>
          </View>
        )}
        ListEmptyComponent={
          selectedHouseholdId !== '' && (
            <Text style={styles.noTransactionsText}>No transactions available for this household.</Text>
          )
        }
        contentContainerStyle={styles.container}
      />
      <TouchableOpacity style={styles.recordPaymentButton} onPress={() => setIsPaymentModalVisible(true)}>
        <Text style={styles.recordPaymentButtonText}>Record Payment</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#003366',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginVertical: 15,
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
  recordPaymentButton: {
    alignSelf: 'center',
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 15,
  },
  recordPaymentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  transactionText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 8,
  },
  paidByText: {
    fontSize: 16,
    color: '#777',
    marginBottom: 5,
  },
  transactionAmountPositive: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'green',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  transactionAmountNegative: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  owedSummary: {
    marginBottom: 20,
  },
  owedRow: {
    flexDirection: 'column', // Changed to column to fit both the main owed text and item details below it
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  owedText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
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
  settleUpButton: {
    color: '#007BFF',
    fontWeight: 'bold',
    marginTop: 10,
  },
  noTransactionsText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginTop: 30,
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
});


