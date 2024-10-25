import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from "firebase/auth";
import { NavigationContainer} from '@react-navigation/native';
import AuthStack from './src/navigation/AuthStack'
import AppStack from './src/navigation/AppStack'

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}