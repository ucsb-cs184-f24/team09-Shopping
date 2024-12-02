import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { collection, query, where, getDocs, updateDoc, arrayUnion, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function JoinHouseholdScreen({ navigation }) {
    const [householdCode, setHouseholdCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);
    const [scannerVisible, setScannerVisible] = useState(false);

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        getCameraPermissions();
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
            <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back-outline" size={24} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScannerVisible(true)}>
                    <Text style={styles.qrButtonText}>Scan QR Code</Text>
                </TouchableOpacity> 
            </View>
            <Text style={styles.title}>Join a Household</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter household code"
                value={householdCode}
                onChangeText={setHouseholdCode}
            />
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <TouchableOpacity style={styles.buttonWrapper} onPress={joinHouseholdCode}>
                <Text style={styles.joinHouseText}>Join Household</Text>
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
                        <CameraView
                            onBarCodeScanned={handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr", "pdf417"],
                            }}
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
        backgroundColor: 'white'
    },
    headerContainer: {
        flexDirection: 'row',
        width: '95%',
        justifyContent: "space-between",
        position: 'absolute',
        top: 75,
    },
    qrButtonText: {
        color: "#008F7A",
        fontFamily: 'Avenir',
        fontWeight: 'bold',
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        fontFamily: 'Avenir'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 20,
        borderRadius: 5,
        width: '90%',
        fontFamily: 'Avenir'
    },
    error: {
        color: 'red',
        marginBottom: 20,
        fontFamily: 'Avenir'
    },
    buttonWrapper: {
        width: '90%',
        marginBottom: 15,
        borderRadius: 8,
        backgroundColor: "#008F7A",
        overflow: 'hidden',
        alignItems: 'center',
        padding: 10
    },
    joinHouseText: {
        color: "white",
        fontFamily: 'Avenir',
        fontWeight: 'bold'
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
    closeButton: {
        backgroundColor: '#DF0808',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
