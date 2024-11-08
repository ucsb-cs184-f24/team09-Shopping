import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Modal} from 'react-native';
import { collection, addDoc, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// TODO (COMPLETE): When user inputs name for household, textbox stays within white container (cleaner UI)

export default function CreateHouseholdScreen({ navigation }) {
    const [householdName, setHouseholdName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [householdCode, setHouseholdCode] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [households, setHouseholds] = useState([]);
    const [householdModalVisible, setHouseholdModalVisible] = useState(false);
    const [displayName, setDisplayName] = useState('');

    const fetchDisplayName = async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists()) {
                setDisplayName(userDoc.data().name);
                /* const fetchedDisplayName = userDoc.data().name;
                console.log("Fetched Display Name:", fetchedDisplayName);
                setDisplayName(fetchedDisplayName) */
            } else {
                console.log("User document doesn't exist");
            }
        } catch (error) {
            console.error("Error fetching display name:", error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            setErrorMessage('');
            setHouseholdName('');
            fetchDisplayName();
            // console.log("Display Name after fetch:", displayName);
        }, [displayName])
    );

    // Fetch households associated with user
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
                .filter(doc => doc.displayHouseholdName && doc.displayHouseholdName != '');
            
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
        const trimmedName = householdName.trim();
        const normalizedName = trimmedName.toLowerCase();
        if (!householdName.trim()) {
            setErrorMessage('Household name is required.');
        } else {
            setErrorMessage('');
            const generatedCode = generateCode(6);
            const userId = auth.currentUser.uid; // get current user's ID

            // Add household to Firestore
            try {
                // check if household with same name already exists
                const householdsRef = collection(db, 'households');
                const querySnapshot = await getDocs(
                    query(householdsRef, where('normalizedHouseholdName', '==', normalizedName))
                );

                if (!querySnapshot.empty) {
                    setErrorMessage(`${normalizedName} is already taken. Please choose another name.`);
                    return;
                }
                
                // fetch user's name from 'users' collection
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    console.error("User document not found");
                    return;
                }

                // Add the household to Firestore
                const householdRef = await addDoc(collection(db, 'households'), {
                    displayHouseholdName: trimmedName,
                    normalizedHouseholdName: normalizedName,
                    code: generatedCode,
                    members: [userId],
                });

                await addDoc(collection(db, `households/${householdRef.id}/shoppingLists`), {
                    listName: 'Default Shopping List',
                    createdDate: new Date(),
                });
                
                console.log(`Created initial shopping list for household: ${householdRef.id}`);
                console.log(`Created household: ${trimmedName} with code: ${generatedCode}`);

                setHouseholdModalVisible(false);
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
            <Text style={styles.householdText}>{item.displayHouseholdName}</Text>
        </TouchableOpacity>
    );


    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <View style={styles.screenHeader}>
                <Text style={styles.title}>
                    {displayName ? `Welcome, ${displayName}!` : "Welcome!"}
                </Text>
            </View>

            <View style={styles.subtitleContainer}>
                <Text style={styles.subtitle}>My households</Text>
            </View>
            <View style={styles.listContainer}>
                {households.length > 0 ? (
                    <FlatList 
                        data={households}
                        renderItem={renderHousehold}
                        keyExtractor={item => item.id}
                        style={styles.householdList}
                    />
                ) : (
                    <Text style={styles.noHouseholdsText}>No households created yet! :(</Text>
                )}
            </View>

            <View style={styles.actionButtonContainer}>
                <TouchableOpacity style={styles.actionButtonWrapper} onPress={() => setHouseholdModalVisible(true)}>
                    <View style={styles.button}>
                        <Ionicons name="add" size={20} color="#000" />
                        <Text style={styles.buttonWithIcon}>Create Household</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButtonWrapper} onPress={() => navigation.navigate('JoinHousehold')}>
                    <Text style={styles.buttonText}>Join a household</Text>
                </TouchableOpacity>
            </View>

            {/* <View style={styles.header}>
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
            </View> */}

            {/* <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('JoinHousehold')}
            >
                <Icon name="add" size={30} color='#fff' />
            </TouchableOpacity> */}

            <Modal
                transparent={true}
                visible={householdModalVisible}
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.householdModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create a household</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={householdName}
                            onChangeText={setHouseholdName}
                        />
                        <View style={{ height: 40, justifyContent: 'center', alignItems: 'center' }}>
                            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : <Text style={styles.error}></Text>}
                        </View>

                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.actionButtonWrapper} onPress={() => createHousehold()}>
                                <Text style={styles.buttonText}>Create!</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.actionButtonWrapper2} 
                                onPress={() => {
                                    setHouseholdModalVisible(false);
                                    setErrorMessage(""); // Clear error message on Cancel
                                }}    
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        marginTop: 25,
    },

    screenHeader: {
        marginTop: 0,
        flexDirection: 'row',
        backgroundColor: '#D1FADF',
        borderBottomLeftRadius: 27,
        borderBottomRightRadius: 27,
    },
    title: {
        fontSize: 28,
        marginTop: 70,
        marginBottom: 20,
        marginLeft: 20,
        fontFamily: "Avenir",
    },
    subtitleContainer: {
        marginTop: 24,
        alignItems: 'flex-start',  
    },
    listContainer: {
        marginTop: 6,
        alignItems: 'flex-start',  
        justifyContent: "center",
        alignItems: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 3,
        marginLeft: 20,
        textAlign: 'left',
        fontFamily: "Avenir",
        fontWeight: 'bold',
    },
    householdList: {
        padding: 20,
        paddingTop: 0,
        marginTop: 6,
        width: '100%',
    },
    householdItem: {
        padding: 14,
        width: '100%',
        backgroundColor: '#fff',
        marginBottom: 8,
        borderColor: "#000",
        borderWidth: 1,  
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#F5F5F5"
    },
    householdText: {
        fontSize: 18,
        fontFamily: "Avenir",
    },
    noHouseholdsText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#999',
        marginTop: 20,
        fontFamily: "Avenir",
    },
    actionButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    actionButtonWrapper: {
        backgroundColor: "#E0F7FF",
        flexDirection:'row',
        padding: 10,
        borderRadius: 8,
        marginRight: 10,
    },
    actionButtonWrapper2: {
        backgroundColor: "red",
        flexDirection:'row',
        padding: 10,
        borderRadius: 8,
    },
    buttonWithIcon: {
        color: "#000",
        fontSize: 16,
        marginLeft: 5,
        fontFamily: "Avenir",
    },
    buttonText: {
        color: "#000",
        fontSize: 16,
        fontFamily: "Avenir",
    },
    cancelButtonText: {
        color: "#fff",
        fontSize: 16,
        fontFamily: "Avenir",
    },
    button: {
        flexDirection: 'row', // Ensure icon and text are in a row
        alignItems: 'center', // Align items vertically centered
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
        marginVertical: 10,
        width: '90%',
        alignSelf: 'center',
        fontFamily: "Avenir",
    },
    error: {
        color: 'red',
        textAlign: 'center',
        minHeight: 10,
    },
    buttonContainer: {
        marginBottom: 20,
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
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    householdModal: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        margin: 20,
        maxHeght: '80%',
        justifyContent: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: "Avenir",
    },
    image: {
        width: 16,
        height: 16, 
        marginLeft: 10, 
        resizeMode: 'contain',
        backgroundColor: 'lightgray',
    },
    // fab: {
    //     position: 'absolute',
    //     width: 60,
    //     height: 60,
    //     borderRadius: 30,
    //     backgroundColor: '#7CD4FD',
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     right: 20,
    //     bottom: 20,
    //     elevation: 8, // shadow effect on Android
    //     shadowColor: '#000', // shadow effect on IOS
    //     shadowOffset: { width: 0, height: 2},
    //     shadowOpacity: 0.3,
    //     shadowRadius: 2,
    // },
});
