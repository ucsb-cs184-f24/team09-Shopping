import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs, updateDoc, arrayUnion, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function JoinHouseholdScreen({ navigation }) {
    const [householdCode, setHouseholdCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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
                setErrorMessage(`Already in household ${householdData.displayHouseholdName}`)
                return;
            }

            await updateDoc(householdDoc.ref, {
                members: arrayUnion(userId),
            });

            console.log(`User ${userName} joined household ${householdDoc.displayHouseholdName}`);
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
});