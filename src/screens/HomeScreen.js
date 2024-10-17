
import { View, Text, Button, StyleSheet } from 'react-native';

const HomeScreen = () => {
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

export default HomeScreen

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
  