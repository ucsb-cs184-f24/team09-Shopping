// screens/HomeScreen.js
import React from 'react';
import { View, Text, Button } from 'react-native';
import { firebase } from '../firebase';

export default function HomeScreen({ navigation }) {
  const handleSignOut = () => {
    firebase.auth().signOut().then(() => {
      navigation.navigate('SignIn');
    });
  };

  return (
    <View>
      <Text>Welcome to the Home Page!</Text>
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}
