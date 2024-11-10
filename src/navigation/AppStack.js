import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Ionicons } from 'react-native-vector-icons';
import HouseholdStack from './HouseholdStack';

const Tab = createBottomTabNavigator();

export default function App() {
    return (
        <Tab.Navigator
            initialRouteName="Create Household"
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
                tabBarActiveTintColor: '#008F7A',
                tabBarInactiveTintColor: 'gray',

                // Customize the header title style and remove border for iOS
                headerTitleStyle: {
                    fontSize: 24, // Increase the font size
                    fontWeight: 'bold',
                },
                headerStyle: {
                    backgroundColor: 'white',
                    shadowColor: 'transparent', // Remove shadow/border on iOS
                    elevation: 0, // Remove shadow/border on Android
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Shopping Lists' }} />
            <Tab.Screen name="Create Household" component={HouseholdStack} 
                options={{ 
                    headerShown: false,
                    tabBarLabel: 'Home' // Set the tab title here
                }}   />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} /> 
        </Tab.Navigator>
    );
}