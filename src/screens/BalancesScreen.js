import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { WebView } from 'react-native-webview';
import { PaymentIcon } from 'react-native-payment-icons';

// TODO (COMPLETE): If user to pay does not have PayPal Account, alert user that other user needs to create PayPal account under their profile email
// TODO: Subtract amount paid in firebase to correctly display remaining debt, also need to check if current user owes anything to other user (similar logic to handlePayment?)

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
  const [isAmountModalVisible, setIsAmountModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [payTo, setPayTo] = useState('');
  const [payToItems, setPayToItems] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [balances, setBalances] = useState([]);
  const [netBalances, setNetBalances] = useState([]);
  const [householdMembersCount, setHouseholdMembersCount] = useState(1);
  const [isPayPalWebViewVisible, setIsPayPalWebViewVisible] = useState(false);
  const [payPalUrl, setPayPaylUrl] = useState('');
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

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
    return parseFloat(value).toFixed(precision);
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
      const paymentAmountValue = parseFloat(paymentAmount) || 0;
  
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

  
      if (parseFloat(totalRemainingDebt) === 0) {
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
  
        const repaymentAmountNumeric = parseFloat(repaymentAmount) || 0;
        const remainingPaymentNumeric = parseFloat(remainingPayment) || 0;
        const newRepaymentAmount = normalizeFloat(repaymentAmountNumeric + remainingPaymentNumeric);
        console.log(newRepaymentAmount);
  
        if (newRepaymentAmount >= amount) {
          // Settle debt completely
          await updateDoc(docRef, {
            repaymentAmount: amount,
            status: 'settled',
            repayments: [
              ...repayments,
              { amount: remainingPayment, date: new Date().toISOString(), paymentMethod: 'cash' }, // Add repayment record
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
              { amount: remainingPayment, date: new Date().toISOString(), paymentMethod: 'cash' }, // Add repayment record
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

  useEffect(() => {
    fetchHouseholdMembers();
  }, [selectedHouseholdId]);

  const fetchHouseholdMembers = async () => {
    try {
      if (!selectedHouseholdId) {
        console.log('No household selected.');
        return;
      }
  
      const householdRef = doc(db, 'households', selectedHouseholdId);
      const householdSnapshot = await getDoc(householdRef);
  
      if (householdSnapshot.exists()) {
        console.log('Household data:', householdSnapshot.data());
        
        const members = householdSnapshot.data().members || [];
        console.log('Household members:', members);
        const membersFiltered = members.filter((uid) => uid != auth.currentUser.uid);
  
        const memberData = await Promise.all(
          membersFiltered.map(async (memberId) => {
            const memberRef = doc(db, 'users', memberId);
            const memberSnapshot = await getDoc(memberRef);
  
            if (memberSnapshot.exists()) {
              const { name, email } = memberSnapshot.data();
              console.log(`Fetched member: ${name}, ${email}`);
              return { label: name, value: memberId, email };
            } else {
              console.log(`No data found for user ID: ${memberId}`);
            }
            return null;
          })
        );
  
        const filteredMembers = memberData.filter((member) => member !== null);
        console.log('Filtered members:', filteredMembers);
  
        setHouseholdMembers(filteredMembers);
      } else {
        console.warn(`No household found with ID: ${selectedHouseholdId}`);
      }
    } catch (error) {
      console.error('Error fetching household members:', error);
    }
  };
  

  const handlePayPalPayment = async () => {
    try {
      if (!selectedMember) {
        Alert.alert('Error', 'Please select a member to pay.');
        return;
      }

      if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
        Alert.alert('Error', 'Please enter a valid amount.');
        return;
      }

      const userId = auth.currentUser.uid;
      const paymentAmountValue = normalizeFloat(parseFloat(paymentAmount));
      const balancesRef = query(
        collection(db, `households/${selectedHouseholdId}/balances`),
        where('owedBy', '==', userId),
        where('owedTo', '==', selectedMember)
      );

      const balancesSnapshot = await getDocs(balancesRef);
  
      if (balancesSnapshot.empty) {
        Alert.alert('Error', 'No debt found between you and the selected person.');
        return;
      }
  
      let totalRemainingDebt = 0;
  
      // Calculate total debt
      balancesSnapshot.docs.forEach((doc) => {
        const balanceData = doc.data();
        totalRemainingDebt = normalizeFloat(
          totalRemainingDebt + (balanceData.amount || 0) - (balanceData.repaymentAmount || 0)
        );
      });
  
      if (parseFloat(totalRemainingDebt) === 0) {
        Alert.alert('Warning', 'You do not owe any money to the selected person.');
        return;
      }
  
      if (paymentAmountValue > totalRemainingDebt) {
        Alert.alert('Overpayment Warning', `You are overpaying by $${normalizeFloat(paymentAmountValue - totalRemainingDebt)}. Please modify your payment amount.`);
        return;
      }
  
      // At this point, debt exists; proceed to generate PayPal URL
      const memberRef = doc(db, 'users', selectedMember);
      const memberSnapshot = await getDoc(memberRef);

      if (!memberSnapshot.exists()) {
        Alert.alert('Error', 'The selected member does not have a valid profile.');
        return;
      }

      const memberData = memberSnapshot.data();
      const { email } = memberData;

      if (!email) {
        Alert.alert('Error', 'The selected member does not have a valid PayPal email.');
        return;
      }
  
      // Proceed to generate PayPal payment URL
      const payPalPaymentUrl = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${email}&amount=${paymentAmount}&currency_code=USD&return=https://CartShare.com/success&cancel_return=https://CartShare.com/cancel`;
  
      console.log('PayPal URL:', payPalPaymentUrl);
  
      setPayPaylUrl(payPalPaymentUrl);
      setIsPayPalWebViewVisible(true);
    } catch (error) {
      console.error('Error processing PayPal payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  };

  const handlePayPalSuccess = async (paymentAmount, payTo) => {
    try {
      const userId = auth.currentUser.uid;
      const paymentAmountValue = normalizeFloat(parseFloat(paymentAmount));

      const balancesRef = query(
        collection(db, `households/${selectedHouseholdId}/balances`),
        where('owedBy', '==', userId),
        where('owedTo', '==', payTo)
      );

      const balancesSnapshot = await getDocs(balancesRef);

      let remainingPayment = paymentAmountValue;
      const balances = [];

      balancesSnapshot.docs.forEach((doc) => {
        const balanceData = doc.data();
        balances.push({ ...balanceData, id: doc.id, ref: doc.ref });
      });

      balances.sort((a, b) => a.amount - b.amount);

      for (let i = 0; i < balances.length && remainingPayment > 0; ++i) {
        const balance = balances[i];
        const { amount, repaymentAmount = 0, repayments = [] } = balance;
        const docRef = balance.ref;

        const repaymentAmountNumeric = parseFloat(repaymentAmount) || 0;
        const remainingPaymentNumeric = parseFloat(remainingPayment) || 0;
        const newRepaymentAmount = normalizeFloat(repaymentAmountNumeric + remainingPaymentNumeric);

        if (newRepaymentAmount >= amount) {
          // settle debt completely
          await updateDoc(docRef, {
            repaymentAmount: amount,
            status: 'settled',
            repayments: [
              ...repayments,
              { amount: amount - repaymentAmount, date: new Date().toISOString(), paymentMethod: 'paypal' },
            ],
            lastUpdated: serverTimestamp(),
          });
          remainingPayment = normalizeFloat(newRepaymentAmount - amount);
        } else {
          // partially reduce debt
          await updateDoc(docRef, {
            repaymentAmount: newRepaymentAmount,
            repayments: [
              ...repayments,
              { amount: remainingPayment, date: new Date().toISOString(), paymentMethod: 'paypal' },
            ],
            lastUpdated: serverTimestamp(),
          });
          remainingPayment = 0;
        }
      }
    } catch (error) {
      console.error('Error handling PayPal success:', error);
      Alert.alert('Error', 'Failed to record payment after PayPal transaction. Please try again.');
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
              paymentMethod: repayment.paymentMethod || 'cash',
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
          console.log(transactions);
        } catch (error) {
          console.error('Error fetching household or balances:', error);
        }
      });
  
      return () => unsubscribe();
    }
  }, [selectedHouseholdId, households]);
  
  


  return (
    <KeyboardAvoidingView style={styles.container}>
      {/* Header Section */}
      <View style={styles.screenHeader}>
          <Text style={styles.title}>
              Household Balances
          </Text>
      </View>
  
      {/* Dropdown for selecting household */}
      <View style={styles.ddcontainer}>
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
      </View>
  
      {/* Net Balances Section */}
      {netBalances.length > 0 ? (
        <View style={styles.messageContainer}>
          {netBalances.map((balance, index) => (
            <Text key={index} style={styles.netBalanceText}>
              {balance.owedByUsername} owes {balance.owedToUsername}: $
              {(balance.amount - (balance.repaymentAmount || 0)).toFixed(2)}
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.messageContainer}>
          <Text style={styles.noDebtMessage}>All debts are settled!</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        {selectedHouseholdId && (
          <>
            {/* Record Payment Button */}
            <TouchableOpacity
              style={styles.recordPaymentButton}
              onPress={() => setIsPaymentModalVisible(true)}
            >
              <Text style={styles.recordPaymentButtonText}>Record Payment</Text>
            </TouchableOpacity>

            {/* PayPal Payment Button */}
            <TouchableOpacity
              style={styles.payPalButton}
              onPress={() => {
                setIsAmountModalVisible(true);
              }}
            >
              <PaymentIcon type='paypal'/>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Balances List */}
      {selectedHouseholdId ? (
        balances.length > 0 ? (
          <View style={styles.netBalancesContainer}>
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                // Handle repayment transactions
                if (item.type === 'repayment') {
                  return (
                    <View style={[styles.transactionCard, styles.repaymentTransaction]}>
                      <Text style={styles.transactionDescription}>
                        Repayment of ${normalizeFloat(item.amount)} from {item.owedByUsername} to {item.owedToUsername}
                      </Text>
                      <Text style={styles.transactionMethod}>
                        Method: {item.paymentMethod === 'paypal' ? 'PayPal' : 'Cash'}
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
          </View>
        ) : (<View></View>)
      ) : (
        <Text style={styles.noHouseholdSelectedText}>Please select a household to view balances.</Text>
      )}


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

      {/* Amount Input Modal (PayPal button) */}
      {isAmountModalVisible && (
        <Modal visible={isAmountModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pay with PayPal</Text>
              {/* Dropdown for Member Selection */}
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={(text) => setPaymentAmount(text)}
              />
              <DropDownPicker
                open={isDropdownOpen}
                value={selectedMember}
                items={householdMembers}
                setOpen={setIsDropdownOpen}
                setValue={setSelectedMember}
                placeholder="Select a member to pay"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                listMode="SCROLLVIEW"
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => {
                    setIsAmountModalVisible(false);
                    handlePayPalPayment();
                  }}
                >
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsAmountModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* PayPal WebView */}
      {isPayPalWebViewVisible && (
        <Modal visible={isPayPalWebViewVisible} transparent={true}>
          <View style={styles.webViewContainer}>
            <WebView
              source={{ uri: payPalUrl }}
              style={styles.webView}
              onNavigationStateChange={async (navState) => {
                const { url, title }= navState;
                // console.log('Navigated to URL:', navState.url);
                // console.log('Page Title:', navState.title);

                // PayPal error page
                if (
                  url.includes('INVALID_BUSINESS_ERROR') ||
                  title.toLowerCase().includes('Please try again')
                ) {
                  setIsPayPalWebViewVisible(false);
                  Alert.alert(
                    'PayPal Error',
                    'The recipient does not have a PayPal account associated with their email. Please ask them to create one and try again.'
                  );
                  return;
                }

                if (url.includes('success')) {
                  setIsPayPalWebViewVisible(false);
                  
                  // call debt reduction logic
                  if (!selectedMember || !paymentAmount) {
                    Alert.alert('Error', 'Member or payment amount is missing.');
                    return;
                  }

                  try {
                    await handlePayPalSuccess(paymentAmount, selectedMember);
                    Alert.alert('Success', 'Payment completed successfully!');
                  } catch (error) {
                    console.error('Error processing PayPal payment:', error);
                    Alert.alert('Success', 'Payment completed successfully!');
                  }
                  return;
                }

                if (url.includes('cancel')) {
                  setIsPayPalWebViewVisible(false);
                  Alert.alert('Cancelled', 'Payment was cancelled.');
                  return;
                }
              }}
            />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );  
}  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white"
  },
  screenHeader: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 28,
    marginTop: 80,
    marginLeft: 20,
    fontFamily: "Avenir",
    opacity: 0.5,
  },
  ddcontainer: {
    padding: 20,
  },
  dropdown: {
    borderColor: '#ccc',
    fontFamily: 'Avenir'
  },
  dropdownContainer: {
    borderColor: '#ccc',
    borderRadius: 8,
  },
  messageContainer: {
    paddingLeft: 20
  },
  noDebtMessage: {
    fontFamily: 'Avenir',
    fontSize: 16,
    fontWeight: "bold"
  },
  netBalancesContainer: {
    backgroundColor: '#ECECEC',
    borderRadius: 8,
    padding: 15,
    margin: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5, 
    gap: 6,
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#ffffff',
    // marginBottom: 5,
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#008F7A',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 8,
    width: '45%'
  },
  payPalButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#0000FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 8,
    width: '45%'
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: 'Avenir'
  },
  recordPaymentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Avenir',
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
    fontFamily: 'Avenir',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    // fontFamily: 'Avenir',
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    width: '114%', // Set a narrower width, adjustable as needed
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8, // Slightly rounded corners for a more rectangular shape
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 6,
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
    fontFamily: 'Avenir',
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionPayer: {
    fontFamily: 'Avenir',
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    marginBottom: 3,
  },
  transactionPayee: {
    fontFamily: 'Avenir',
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    marginBottom: 3,
  },
  transactionAmount: {
    fontFamily: 'Avenir',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    // marginTop: 6,
  },
  transactionDate: {
    fontFamily: 'Avenir',
    fontSize: 11,
    color: '#999',
    marginTop: 5,
    textAlign: 'right',
  },
  transactionMethod: {
    fontFamily: 'Avenir',
    fontSize: 14,     
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  transactionContainer: {
    paddingHorizontal: 20,
  },
  negativeAmount: {
    fontFamily: 'Avenir',
    color: '#d9534f', // Red color for negative values
  },
  positiveAmount: {
    fontFamily: 'Avenir',
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
    fontFamily: 'Avenir',
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
    backgroundColor: '#DF0808',
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 20,
    marginTop: 12,
    marginBottom: 0,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)'
  },
  webView: {
    flex: 1,
  },
  payPalButtonText: {
    fontFamily: 'Avenir',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
});