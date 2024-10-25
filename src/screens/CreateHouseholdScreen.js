// TASK 1: once a user creates household, auto-generates code that can be shared to other people
// (TODO) TASK 2: once household AND Code made, return to householdscreen except they can create another household, and the household that was made is now an icon to click at

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig'; // Make sure to use the correct path

export default function CreateHouseholdScreen({ navigation }) {
    const [householdName, setHouseholdName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [householdCode, setHouseholdCode] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [households, setHouseholds] = useState([]);

    // fetch households from Firestore
    useEffect(() => {
        const q = query(
            collection(db, 'households'),
            where('members', 'array-contains', auth.currentUser.uid)
        ); // maybe add filters later

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const householdList = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                // Filter to include only documents with valid householdName
                .filter(doc => doc.householdName && doc.householdName.trim() != '');
            
            setHouseholds(householdList);
        }, (error) => {
            console.error("Error fetching households: ", error);
        });

        return () => unsubscribe();
    }, []);

    const generateCode = (length) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; ++i) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    const createHousehold = async () => {
        if (!householdName.trim()) {
            setErrorMessage('Household name is required.');
        } else {
            setErrorMessage('');
            const generatedCode = generateCode(6);

            // Add household to Firestore
            try {
                const docRef = await addDoc(collection(db, 'households'), {
                    householdName,
                    code: generatedCode,
                    members: [auth.currentUser.uid], // Add current user as the first member
                });
                console.log(`Creating household: ${householdName} with code: ${generateCode}`);
                setHouseholdCode(generatedCode);
                setShowCode(false);
                setHouseholdName(''); // reset input field after creation
            } catch (error) {
                console.error("Error creating household: ", error);
            }
        }
    };

    const renderHousehold = ({ item }) => (
        <TouchableOpacity
            style={styles.householdItem}
            onPress={() => navigation.navigate('HouseholdDetails', { householdId: item.id })}
        >
            <Text style={styles.householdText}>{item.householdName}</Text>
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Create a New Household</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter household name"
                    value={householdName}
                    onChangeText={setHouseholdName}
                />
                {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
                <View style={styles.buttonContainer}>
                    <Button title="Create Household" onPress={createHousehold} />
                </View>
            </View>
            <View style={styles.listContainer}>
                <Text style={styles.subtitle}>Your Households</Text>
                {households.length > 0 ? (
                    <FlatList 
                        data={households}
                        renderItem={renderHousehold}
                        keyExtractor={item => item.id}
                        style={styles.householdList}
                    />
                ) : (
                    <Text style={styles.noHouseholdsText}>No households created yet!</Text>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

// Define styles using StyleSheet
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollViewContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        marginTop: 50,
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 3,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 20,
        borderRadius: 5,
        width: '90%',
        alignSelf: 'center',
    },
    error: {
        color: 'red',
        marginBottom: 20,
        textAlign: 'center',
    },
    buttonContainer: {
        marginBottom: 30,
        width: '90%',
        alignSelf: 'center',
    },
    listContainer: {
        flex: 1,
    },
    householdList: {
        marginTop: 20,
    },
    householdItem: {
        padding: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        marginBottom: 10,
    },
    householdText: {
        fontSize: 18,
    },
    noHouseholdsText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#999',
        marginTop: 20.
    },
});
