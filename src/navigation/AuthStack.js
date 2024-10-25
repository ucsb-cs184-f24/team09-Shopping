import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HouseholdDetailsScreen from '../screens/HouseholdDetailsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
      <Stack.Navigator screenOptions={{ headerShown: false}} >
        <Stack.Screen name="Login" component={LoginScreen} /> 
        <Stack.Screen name="Register" component={RegisterScreen}/>
        <Stack.Screen name="HouseholdDetails" component={HouseholdDetailsScreen} />
      </Stack.Navigator>
  );
}