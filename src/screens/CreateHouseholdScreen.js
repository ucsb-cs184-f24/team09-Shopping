import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform} from 'react-native';
import { collection, addDoc, query, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig'; // Make sure to use the correct path
import { getDoc, doc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function CreateHouseholdScreen({ navigation }) {
    const [householdName, setHouseholdName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [householdCode, setHouseholdCode] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [households, setHouseholds] = useState([]);

    // fetch households from Firestore
    useEffect(() => {
        const userId = auth.currentUser.uid;

        const q = query(
            collection(db, 'households'),
            where('members', 'array-contains', userId)
        );

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
            const userId = auth.currentUser.uid; // get current user's ID

            // Add household to Firestore
            try {
                // fetch user's name from 'users' collection
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    console.error("User document not found");
                    return;
                }

                await addDoc(collection(db, 'households'), {
                    householdName,
                    code: generatedCode,
                    members: [userId],
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
                    <View style={styles.buttonWrapper}>
                        <Button title="Create Household" onPress={createHousehold} />
                    </View>
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

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('JoinHousehold')}
            >
                <Icon name="add" size={30} color='#fff' />
            </TouchableOpacity>
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
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    buttonWrapper: {
        width: '100%',
        marginBottom: 15,
        borderRadius: 25,
        overflow: 'hidden',
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
    fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        right: 20,
        bottom: 20,
        elevation: 8, // shadow effect on Android
        shadowColor: '#000', // shadow effect on IOS
        shadowOffset: { width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
});
