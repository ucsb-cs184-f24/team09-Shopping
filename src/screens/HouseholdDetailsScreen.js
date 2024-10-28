import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { doc, getDoc, updateDoc, arrayRemove, deleteDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { db, auth } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Icon name="arrow-back" size={24} color="#000" />
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            {household ? (
                <>
                    <Text style={styles.title}>{household.displayHouseholdName}</Text>
                    <Text>Code: {household.code}</Text>
                    <Text style={styles.subtitle}>Members:</Text>
                    <FlatList 
                        data={members}
                        renderItem={renderMember}
                        keyExtractor={item => item.userId}
                        style={styles.membersList}
                    />
                    <TouchableOpacity style={styles.leaveButton} onPress={confirmLeaveHousehold}>
                        <Text style={styles.leaveButtonText}>Leave Group</Text>
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
        marginTop: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    membersList: {
        width: '90%',
    },
    memberItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    leaveButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: 'red',
        borderRadius: 5,
        alignItems: 'center',
        width: '90%',
    },
    leaveButtonText: {
        color: '#fff',
        fontSize: 16,
    },
});
