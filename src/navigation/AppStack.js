import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HouseholdStack from './HouseholdStack';
import BalancesScreen from '../screens/BalancesScreen';
import SummaryScreen from '../screens/SummaryScreen';

const Tab = createBottomTabNavigator();

export default function App() {
    return (
        <Tab.Navigator
            initialRouteName="Households"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let iconName;
                    if (route.name === 'Shopping Lists') {
                        iconName = 'list';
                    } else if (route.name === 'Households') {
                        iconName = 'home';
                    } else if (route.name === 'Balances') {
                        iconName = 'wallet';
                    } else if (route.name === 'Summary') {
                        iconName = 'bar-chart';
                    } else if (route.name ==='Profile') {
                        iconName = 'person-circle';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#008F7A',
                tabBarInactiveTintColor: 'gray',
                // Customize the header title style and remove border for iOS
                headerTitleStyle: {
                    fontSize: 24,
                    fontWeight: 'bold',
                },
                headerStyle: {
                    backgroundColor: 'white',
                    shadowColor: 'transparent', // Remove shadow/border on iOS
                    elevation: 0, // Remove shadow/border on Android
                },
            })}
        >
            <Tab.Screen name="Shopping Lists" component={HomeScreen} 
                options={{ 
                    headerShown: false,
                }}
            />
            <Tab.Screen name= "Households" component={HouseholdStack} 
                options={{ 
                    headerShown: false,
                }}
            />
            <Tab.Screen name="Balances" component={BalancesScreen} 
                options={{ 
                    headerShown: false,
                }}
            />
            <Tab.Screen 
                name="Summary" 
                component={SummaryScreen} 
                options={{ 
                    headerShown: false,
                }}
            />
            <Tab.Screen name="Profile" component={ProfileScreen}
                options={{ 
                    headerShown: false,
                }}
            /> 
        </Tab.Navigator>
    );
}