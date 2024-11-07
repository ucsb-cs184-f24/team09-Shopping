import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { collection, query, where, getDocs, updateDoc, arrayUnion, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { BarCodeScanner } from 'expo-barcode-scanner';

// TODO (COMPLETE): change formatting of button for better UI

export default function JoinHouseholdScreen({ navigation }) {
    const [householdCode, setHouseholdCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);
    const [scannerVisible, setScannerVisible] = useState(false);

    useEffect(() => {
        const requestPermission = async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        requestPermission();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            setErrorMessage('');
            setHouseholdCode('');
        }, [])
    );

    const handleBarCodeScanned = ({ data }) => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        
        const householdId = data;
        joinHouseHoldId(householdId);
        setScannerVisible(false);
    
        // Re-enable scanning after a delay
        setTimeout(() => setIsProcessing(false), 2000); // 2 seconds delay
    };

    const joinHouseHoldId = async (householdId) => {
        const userId = auth.currentUser.uid;
    
        try {
            const userDocRef = doc(db, 'users', userId);
            const userDocSnap = await getDoc(userDocRef);
    
            if (!userDocSnap.exists()) {
                console.error("User document not found");
                return;
            }
    
            const userName = userDocSnap.data().name;
    
            const householdDocRef = doc(db, 'households', householdId);
            const householdDocSnap = await getDoc(householdDocRef);
    
            if (!householdDocSnap.exists()) {
                setErrorMessage('No household found with that ID.');
                return;
            }
    
            const householdData = householdDocSnap.data();
    
            if (householdData.members.includes(userId)) {
                setErrorMessage(`Already in household ${householdData.displayHouseholdName}`);
                return;
            }
    
            await updateDoc(householdDocRef, {
                members: arrayUnion(userId),
            });
    
            console.log(`User ${userName} joined household ${householdData.displayHouseholdName}`);
            navigation.navigate('CreateHousehold');
        } catch (error) {
            console.log("Error joining household: ", error);
            setErrorMessage('An error occurred while trying to join the household.');
        }
    };

    const joinHouseholdCode = async () => {
        const userId = auth.currentUser.uid;
        if (!householdCode.trim()) {
            setErrorMessage('Household code is required.');
            return;
        }

        try {
            const userDocRef = doc(db, 'users', userId);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                console.error("User document not found");
                return;
            }

            const userName = userDocSnap.data().name;

            const q = query(collection(db, 'households'), where('code', '==', householdCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setErrorMessage('No household found with that code.');
                return;
            }

            const householdDoc = querySnapshot.docs[0];
            const householdData = householdDoc.data();

            if (householdData.members.includes(userId)) {
                setErrorMessage(`Already in household ${householdData.displayHouseholdName}`);
                return;
            }

            await updateDoc(householdDoc.ref, {
                members: arrayUnion(userId),
            });

            console.log(`User ${userName} joined household ${householdData.displayHouseholdName}`);
            navigation.navigate('CreateHousehold');
        } catch (error) {
            console.log("Error joining household: ", error);
            setErrorMessage('An error occurred while trying to join the household.');
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Icon name="arrow-back" size={24} color="#000" />
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Join a Household</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter household code"
                value={householdCode}
                onChangeText={setHouseholdCode}
            />
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <View style={styles.buttonWrapper}>
                <Button title="Join Household" onPress={joinHouseholdCode} />
            </View>
            <TouchableOpacity style={styles.qrButton} onPress={() => setScannerVisible(true)}>
                <Text style={styles.qrButtonText}>Scan QR Code</Text>
            </TouchableOpacity>
            <Modal
                visible={scannerVisible}
                animationType="slide"
                onRequestClose={() => setScannerVisible(false)}
            >
                <View style={styles.scannerContainer}>
                    {hasPermission === null ? (
                        <Text>Requesting for camera permission</Text>
                    ) : hasPermission === false ? (
                        <Text>No access to camera</Text>
                    ) : (
                        <BarCodeScanner
                            onBarCodeScanned={handleBarCodeScanned}
                            style={StyleSheet.absoluteFillObject}
                        />
                    )}
                    <View style={styles.bottomContainer}>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setScannerVisible(false)}>
                            <Text style={styles.closeButtonText}>Close Scanner</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 40,
        left: 20,
    },
    backButtonText: {
        fontSize: 16,
        marginLeft: 5,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 20,
        borderRadius: 5,
        width: '90%',
    },
    error: {
        color: 'red',
        marginBottom: 20,
    },
    buttonWrapper: {
        width: '100%',
        marginBottom: 15,
        borderRadius: 25,
        overflow: 'hidden',
    },
    scannerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 20,
        width: '80%',
    },
    qrButton: {
    marginTop: 10, // Adds spacing from the "Join Household" button
    backgroundColor: '#28a745', // Green background for differentiation
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000', // Optional shadow for elevation effect
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Android shadow effect
    },
    qrButtonText: {
    color: '#fff', // White text for contrast
    fontWeight: 'bold',
    fontSize: 16,
    },
    closeButton: {
    backgroundColor: '#FF6347', // Tomato color for a noticeable button
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000', // Optional shadow for elevation
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Android shadow effect
    },
    closeButtonText: {
        color: '#fff', // White text for contrast
        fontWeight: 'bold',
        fontSize: 16,
    },
});
