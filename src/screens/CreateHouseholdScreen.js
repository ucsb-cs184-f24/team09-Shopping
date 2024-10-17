import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

export default function CreateHousholdScreen({ navigation }) {
    const [householdName, setHouseholdName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const createHousehold = () => {

        if (!householdName.trim()) {
            setErrorMessage('Household name is required.');
        } else {
            setErrorMessage('');

            // add logic to save to Firebase
            // **FOR NOW**: temporary print statement as placeholder (See log in terminal)
            console.log(`Creating household: ${householdName}`);
            // Navigate to new screen or provide user feedback after successful creation
            // **FOR NOW**: navigating back to home screen
            navigation.goBack();
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
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text>: null}
            <Button title="Create Household" onPress={createHousehold}/>
        </View>
    );
}

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