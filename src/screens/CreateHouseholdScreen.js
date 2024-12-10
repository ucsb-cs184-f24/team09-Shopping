import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TextInput, Button, StyleSheet, Image, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Modal} from 'react-native';
import { collection, addDoc, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from './ProfileScreen';

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
        }, [])
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

                // if (!querySnapshot.empty) {
                    
                //     setErrorMessage(`${normalizedName} is already taken. Please choose another name.`);
                //     return;
                // }
                
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
            <Ionicons name="chevron-forward-outline" size={20} color="#000" />
        </TouchableOpacity>
    );


    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            {/* Header */}
            <View style={styles.screenHeader}>
                <Text style={styles.title}>
                    {displayName ? `Welcome, ${displayName}!` : "Welcome!"}
                </Text>
            </View>

            {households.length > 0 ? (  
                <View style={styles.householdContainer}>
                    <View style={styles.subtitleContainer}>
                        <Text style={styles.subtitle}>My households</Text>
                    </View>
                    <View style={styles.listContainer}>
                        <FlatList 
                            data={households}
                            renderItem={renderHousehold}
                            keyExtractor={item => item.id}
                            style={styles.householdList}
                        />
                    </View>
                    <View style={styles.actionButtonContainer}>
                        <TouchableOpacity style={styles.actionButtonWrapper} onPress={() => setHouseholdModalVisible(true)}>
                            <View style={styles.button}>
                                <Ionicons name="add" size={16} color="#FFF" />
                                <Text style={styles.buttonWithIcon}>Create Household</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButtonWrapper} onPress={() => navigation.navigate('JoinHousehold')}>
                            <View style={styles.button}>
                                <Ionicons name="home-outline" size={16} color="#FFF" />
                                <Text style={styles.buttonWithIcon}>Join a household</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.noHouseholdsContainer}>
                    <Text style={styles.noHouseholdsText}>Get started!</Text>
                    <View style={styles.actionButtonContainerNoHouseholds}>
                        <TouchableOpacity style={styles.actionButtonWrapperNoHouseholds} onPress={() => setHouseholdModalVisible(true)}>
                            <View style={styles.button}>
                                <Ionicons name="add" size={22} color="#FFF" />
                                <Text style={styles.buttonWithIcon}>Create Household</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButtonWrapperNoHouseholds} onPress={() => navigation.navigate('JoinHousehold')}>
                            <View style={styles.button}>
                                <Ionicons name="home-outline" size={22} color="#FFF" />
                                <Text style={styles.buttonWithIcon}>Join a household</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

            )}
            <Modal
                transparent={true}
                visible={householdModalVisible}
                animationType="slide"
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.householdModal}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Create a Household</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    value={householdName}
                                    onChangeText={setHouseholdName}
                                    placeholder="Enter household name"
                                />
                                <View
                                    style={{
                                        height: 20,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    {errorMessage ? (
                                        <Text style={styles.error}>{errorMessage}</Text>
                                    ) : (
                                        <Text style={styles.error}></Text>
                                    )}
                                </View>
                                <View style={styles.modalButtonContainer}>
                                    <TouchableOpacity
                                        style={styles.createButton}
                                        onPress={() => createHousehold()}
                                    >
                                        <Text style={styles.buttonWithIcon}>Create!</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => {
                                            setHouseholdModalVisible(false);
                                            setErrorMessage(""); // Clear error message on Cancel
                                        }}
                                    >
                                        <Text style={styles.buttonWithIcon}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
        flexDirection: 'row',
    },
    title: {
        fontSize: 28,
        marginTop: 80,
        marginLeft: 20,
        fontFamily: "Avenir",
        opacity: 0.5,
        fontWeight: "bold",
    },
    householdContainer: {
        backgroundColor: "#ECECEC", // Secondary Color
        marginLeft: 25,
        marginRight: 25,
        marginTop: 32,
        borderRadius: 8,
        shadowColor: '#000000',  // Black color
        shadowOffset: { width: 0, height: 3 },  // Position X: 0, Y: 3
        shadowOpacity: 0.2,  // 20% opacity
        shadowRadius: 5,  // Blur
    },
    subtitleContainer: {
        marginTop: 24,
        alignItems: 'flex-start',  

    },
    listContainer: {
        marginTop: 6,
        alignItems: 'flex-start',  
        justifyContent: "center",
    },
    subtitle: {
        fontSize: 18,
        marginLeft: 20,
        textAlign: 'left',
        fontFamily: "Avenir",
        opacity: 0.8,
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
        marginBottom: 12,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "space-between"
    },
    householdText: {
        fontSize: 18,
        fontFamily: "Avenir",
    },
    noHouseholdsText: {
        textAlign: 'center',
        fontSize: 20,
        color: "#000",
        marginTop: 20,
        fontFamily: "Avenir",
    },
    noHouseholdsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 20,
        marginRight: 20,
        marginBottom: 20,
        gap: 10,
    },
    actionButtonContainerNoHouseholds: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 18,
        marginLeft: 20,
        marginRight: 20,
        marginBottom: 20,
        gap: 16,
    },
    actionButtonWrapper: { // Households exist
        backgroundColor: "#008F7A",
        flexDirection:'row',
        padding: 11,
        borderRadius: 8,
    },
    actionButtonWrapperNoHouseholds: { // No households exist
        backgroundColor: "#008F7A",
        flexDirection:'row',
        paddingRight: 20,
        paddingLeft: 20,
        paddingTop: 45,
        paddingBottom: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    actionButtonWrapper2: {
        backgroundColor: "#DF0808",
        flexDirection:'row',
        padding: 11,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 5,
    },
    createButton: {
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
        marginLeft: 10, // Add spacing between buttons
        alignItems: 'center',
    },
    buttonWithIcon: {
        color: "#FFF",
        fontSize: 15,
        marginLeft: 5,
        fontFamily: "Avenir",
        fontWeight: 'bold',
    },
    buttonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "Avenir",
        color: "white"
    },
    button: {
        // flexDirection: 'row', // Ensure icon and text are in a row
        alignItems: 'center', // Align items vertically centered
        justifyContent: 'center',
        gap: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 6,
        borderRadius: 5,
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
        justifyContent: "center",
        padding: 20,
        borderRadius: 10,
        margin: 20,
        alignItems: "center",
        elevation: 5, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        // justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
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
    rightArrow: {
        alignContent: "flex-end",
    }


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