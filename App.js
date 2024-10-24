// screens/AccountScreen.js
import React from 'react';
import { View, Text, Button } from 'react-native';
import { firebase } from '../firebase';

export default function AccountScreen({ navigation }) {
  const handleSignOut = () => {
    firebase.auth().signOut().then(() => {
      navigation.navigate('SignIn');
    });
  };

  return (
    <View>
      <Text>Sign Out Page</Text>
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}
