import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { doc, getDoc, updateDoc, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

export default function HouseholdDetailsScreen({ route, navigation }) {
    const { householdId } = route.params;
    const [household, setHousehold] = useState(null);
    const [members, setMembers] = useState(null);

    useEffect(() => {
        const fetchHousehold = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    console.error("User is not authenticated");
                    return;
                }
                // console.log("Authenticated user ID:", user.uid);

                const docRef = doc(db, 'households', householdId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const householdData = docSnap.data();
                    // console.log("Fetched household data: ", householdData);
                    setHousehold(householdData);

                    const memberPromises = householdData.members.map(async (userId) => {
                        // console.log("Fetching user data for userId:", userId);
                        const userDocRef = doc(db, 'users', userId);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            return { userId, name: userDocSnap.data().name };
                        } else {
                            // console.log("Reached here");
                            console.error("User document not found for userId: ", userId);
                            return { userId, name: "Unknown User" };
                        }
                    });

                    const memberDetails = await Promise.all(memberPromises);
                    setMembers(memberDetails);
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching household details: ", error);
            }
        };

        fetchHousehold();
    }, [householdId]);

    const leaveHousehold = async () => {
        const userId = auth.currentUser.uid;
        const householdRef = doc(db, 'households', householdId);

        try {
            await updateDoc(householdRef, {
                members: arrayRemove(userId),
            });

            // check if there are any members left
            const updatedHouseholdSnap = await getDoc(householdRef);
            const updatedHouseholdData = updatedHouseholdSnap.data();

            if (updatedHouseholdData.members.length === 0) {
                await deleteDoc(householdRef);
                Alert.alert("Household Deleted", `You have successfully left and deleted the household: ${household.displayHouseholdName}.`);
            } else {
                Alert.alert("Left Household", `You have successfully left the household: ${household.displayHouseholdName}.`);
            }
            
            navigation.navigate("CreateHousehold");
        } catch (error) {
            console.error("Error leaving household: ", error);
            Alert.alert("Error", "An error occurred while trying to leave the household.");
        }
    };

    const confirmLeaveHousehold = () => {
        Alert.alert(
            `Leaving ${household.displayHouseholdName}`,
            "Are you sure you want to leave this household?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Yes", onPress: leaveHousehold }
            ]
        );
    };

    const renderMember = ({ item }) => (
        <View style={styles.memberItem}>
            <Text>{item.name}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.backButtonContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back-outline" size={24} color="#000" />
                    </TouchableOpacity>
            </View>
            {household ? (
                <>
                    <Text style={styles.title}>{household.displayHouseholdName}</Text>
                    <Text style={styles.code}>Code: {household.code}</Text>
                    <View style={styles.membersList}>
                        <Text style={styles.subtitle}>Members</Text>
                        <FlatList
                            data={members}
                            renderItem={renderMember}
                            keyExtractor={item => item.userId}
                        />
                    </View>
                    <View style={styles.qrCodeContainer}>
                        <QRCode 
                            value={householdId} // Use household ID as the value
                            size={200}          // Customize size as needed
                        />
                    </View>
                    <TouchableOpacity style={styles.leaveButton} onPress={confirmLeaveHousehold}>
                        <Text style={styles.leaveButtonText}>Leave household</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <Text>Loading...</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
    },
    backButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 75,
        left: 25,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 40,
        left: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 6,
        marginTop: 80,
        textAlign: 'center',
        fontFamily: 'Avenir'
    },
    subtitle: {
        fontSize: 18,
        textAlign: 'left',
        fontFamily: "Avenir",
        opacity: 0.8,
    },
    membersList: {
        backgroundColor: "#ECECEC",
        padding: 15,
        borderRadius: 8,
        marginTop: 24,
        marginRight: 30,
        marginLeft: 30,
        shadowColor: '#000000',  // Black color
        shadowOffset: { width: 0, height: 3 },  // Position X: 0, Y: 3
        shadowOpacity: 0.2,  // 20% opacity
        shadowRadius: 5,  // Blur
        gap: 6,
        width: '90%',
    },
    memberItem: {
        padding: 14,
        marginBottom: 6,
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "space-between"
    },
    leaveButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#DF0808',
        borderRadius: 8,
        alignItems: 'center',
        width: '90%',
        position: 'absolute',
        bottom: 0,
        marginBottom: 20,
    },
    leaveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Avenir',
        fontWeight: 'bold'
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    code: {
        fontFamily: 'Avenir',
        opacity: 0.5,
    },
    qrCodeContainer: {
        marginTop: 64,
    }
});

