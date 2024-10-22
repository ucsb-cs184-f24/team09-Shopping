import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Make sure to use the correct path

export default function CreateHouseholdScreen({ navigation }) {
    const [householdName, setHouseholdName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const createHousehold = async () => {
        if (!householdName.trim()) {
            setErrorMessage('Household name is required.');
        } else {
            setErrorMessage('');

            // Add household to Firestore
            try {
                await addDoc(collection(db, 'households'), { householdName });
                console.log(`Creating household: ${householdName}`);
                navigation.goBack();
            } catch (error) {
                console.error("Error creating household: ", error);
            }
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create a New Household</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter household name"
                value={householdName}
                onChangeText={setHouseholdName}
            />
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <Button title="Create Household" onPress={createHousehold} />
        </View>
    );
}

// Define styles using StyleSheet
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 20,
        borderRadius: 5,
    },
    error: {
        color: 'red',
        marginBottom: 20,
        textAlign: 'center',
    },
});
