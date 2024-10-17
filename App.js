import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // If you want to add more sections in the future
import HomeScreen from './src/screens/HomeScreen'; // This is where your shopping list feature resides
import { Ionicons } from 'react-native-vector-icons'; // For icons in the bottom navigation
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCqZfBoHz9xHQauW8AujAtYWCb-wbVRoak",
  authDomain: "team09shopping.firebaseapp.com",
  projectId: "team09shopping",
  storageBucket: "team09shopping.appspot.com",
  messagingSenderId: "109915220092",
  appId: "1:109915220092:web:f00008ccde2f52b8f781f9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Firestore for shopping list

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = 'list'; // Icon for shopping list
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        {/* Tab for the shopping list (Home screen) */}
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Shopping List' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
