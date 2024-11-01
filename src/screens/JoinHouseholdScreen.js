import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { collection, query, where, getDocs, updateDoc, arrayUnion, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function JoinHouseholdScreen({ navigation }) {
    const [householdCode, setHouseholdCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [scannerVisible, setScannerVisible] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            setErrorMessage('');
            setHouseholdCode('');
        }, [])
    );

    useEffect(() => {
        const requestPermission = async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        requestPermission();
    }, []);

    const handleBarCodeScanned = ({ data }) => {
        setScanned(true);
        setHouseholdCode(data); // populate scanned code
        setScannerVisible(false);
        Alert.alert('Code Scanned', `Household Code: ${data}`);
    };

    const joinHousehold = async () => {
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
                <Button title="Join Household" onPress={joinHousehold} />
            </View>
            <Button title="Scan QR Code" onPress={() => setScannerVisible(true)} />

            {/* QR Scanner Modal */}
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
                            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                            style={{ width: '100%', height: '100%' }}
                        />
                    )}
                    <Button title="Close Scanner" onPress={() => setScannerVisible(false)} />
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
    },
});
