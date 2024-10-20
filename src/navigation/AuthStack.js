import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateHousholdScreen from '../screens/CreateHouseholdScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
      <Stack.Navigator >
        <Stack.Screen name="LoginScreen" component={LoginScreen} /> 
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Create Household" component={CreateHousholdScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
  );
}