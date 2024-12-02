import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CreateHouseholdScreen from '../screens/CreateHouseholdScreen';
import HouseholdDetailsScreen from '../screens/HouseholdDetailsScreen';
import JoinHouseholdScreen from '../screens/JoinHouseholdScreen';

const Stack = createStackNavigator();

export default function HouseholdStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen 
                name="CreateHousehold" 
                component={CreateHouseholdScreen} 
            />
            <Stack.Screen 
                name="HouseholdDetails" 
                component={HouseholdDetailsScreen}  
            />
            <Stack.Screen 
                name="JoinHousehold"
                component={JoinHouseholdScreen}
            />
        </Stack.Navigator>
    );
}
