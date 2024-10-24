import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function HouseholdDetailsScreen({ route }) {
    const { householdId } = route.params;
    const [household, setHousehold] = useState(null);

    useEffect(() => {
        const fetchHousehold = async () => {
            try {
                const docRef = doc(db, 'households', householdId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setHousehold(docSnap.data());
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching household details: ", error);
            }
        };

        fetchHousehold();
    }, [householdId]);

    return (
        <View style={styles.container}>
            {household ? (
                <>
                    <Text style={styles.title}>{household.householdName}</Text>
                    <Text>Code: {household.code}</Text>
                    {/* Add more details if needed */}
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
    title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
    },
});
