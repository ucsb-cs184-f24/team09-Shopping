import { useState } from 'react'
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native'
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);

    const handleLogin = () => {
        signInWithEmailAndPassword(auth, email, password)
            .then(userCredentials => {
                console.log('Logged in with:', userCredentials.user.email);
                alert("You successfully signed in!");
            })
            .catch(error => {
                if (error.code === 'auth/invalid-email') {
                    alert("Please enter both email and password.");
                } else if (error.code === 'auth/invalid-credential') {
                    alert("Your password is incorrect or this account doesn't exist. Please try again.");
                } else {
                    alert(error.message);
                }
            });
    };

    const handleNavigateToRegister = () => {
        navigation.navigate('Register');
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
        >
            {/* Logo Section */}
            <View style={styles.logoContainer}>
                <Image 
                    source={require('../../assets/cart.png')}
                    style={styles.logo}
                />
                <Text style={styles.welcomeText}>Welcome to CartShare!</Text>
                <Text style={styles.subText}>Please log in to continue</Text>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Email"
                    value={email}
                    onChangeText={text => setEmail(text)}
                    style={styles.input}
                />
                <View style={styles.passwordContainer}>
                    <TextInput
                        placeholder="Password"
                        value={password}
                        onChangeText={text => setPassword(text)}
                        style={styles.passwordInput}
                        secureTextEntry={!passwordVisible}
                    />
                    <TouchableOpacity
                        onPress={() => setPasswordVisible(!passwordVisible)}
                        testID="passwordToggle"
                    >
                        <Ionicons name={passwordVisible ? "eye" : "eye-off"} size={24} color="black" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    onPress={handleLogin}
                    style={styles.button}
                >
                    <Text style = {styles.buttonText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleNavigateToRegister}
                >
                    <Text style = {styles.buttonOutlineText}>New User? Sign up here!</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 10,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Avenir',
    },
    subText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 5,
        fontFamily: 'Avenir',
    },
    inputContainer: {
        backgroundColor: "#ECECEC",
        padding: 15,
        borderRadius: 8,
        marginRight: 30,
        marginLeft: 30,
        shadowColor: '#000000',  // Black color
        shadowOffset: { width: 0, height: 3 },  // Position X: 0, Y: 3
        shadowOpacity: 0.2,  // 20% opacity
        shadowRadius: 5,  // Blur
        gap: 10,
    },
    input: {
        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        fontFamily: 'Avenir'
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: 'white',
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 5,
        fontFamily: 'Avenir'
    },
    buttonContainer: {
        padding: 15,
        marginRight: 30,
        marginLeft: 30,
        width: '90%',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        gap: 20,
    },
    button: {
        width: '100%',
        backgroundColor: '#008F7A',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center'
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Avenir',
    },
    buttonOutlineText: {
        color: '#008F7A',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Avenir',
    }
    
})