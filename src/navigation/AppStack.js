import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import CreateHouseholdScreen from '../screens/CreateHouseholdScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Ionicons } from 'react-native-vector-icons';

const Tab = createBottomTabNavigator();

export default function App() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                let iconName;

                if (route.name === 'Home') {
                    iconName = 'list';
                } else if (route.name === 'Create Household') {
                    iconName = 'home';
                } else if (route.name ==='Profile') {
                    iconName = 'person-circle'
                }

                return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: 'tomato',
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Shopping List' }} />
            <Tab.Screen name="Create Household" component={CreateHouseholdScreen} options={{ title: 'Create Household' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} /> 
        </Tab.Navigator>
    );
}