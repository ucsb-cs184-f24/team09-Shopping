import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack'; 
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; 

import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

import SignInScreen from './src/screens/SignInScreen'; 
import HomeScreen from './src/screens/HomeScreen'; 
import AccountScreen from './src/screens/AccountScreen'; 
import AboutScreen from './src/screens/AboutScreen'; 


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: 'purple',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: {
          fontSize: 14, // Adjust the font size as needed
          fontWeight: 'bold',
        },
        headerShown: false, // Hide the header on tab screens
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
      <Tab.Screen name="About" component={AboutScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      {user ? (
        // If the user is signed in, show the app tabs
        <AppTabs />
      ) : (
        // If the user is not signed in, show the authentication screens
        <Stack.Navigator>
          <Stack.Screen
            name="SignInScreen"
            component={SignInScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
