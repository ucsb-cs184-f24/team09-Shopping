import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, Text, Button } from 'react-native';
import CreateHousholdScreen from './src/screens/CreateHouseholdScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Create Household" component={CreateHousholdScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text>Welcome to the Shared Shopping App!</Text>
      {/* CAN ADJUST LOCATION OF BUTTON IF NEEDED LATER */}
      <View style={styles.buttonContainer}>
        <Button
          title="Create Household"
          onPress={() => navigation.navigate('Create Household')}  
        />
      </View>
    </View>
  );
}

// title and buttonContainer used for adjusting BUTTON LOCATION
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#fffff',  // Changing the background to red to test
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 50,
    alignSelf: 'center',
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 325,
  },
});

