import { useState } from 'react';
import { Image, KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ScrollView } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RegisterScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

    const handleSignUp = async () => {
        if (!name.trim() || !email.trim() || !phone.trim() || !address.trim() || !password.trim() || !confirmPassword.trim()) {
            alert('Please fill in all fields!');
            return;
        }
        if (password != confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        try {
            const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredentials.user;

            await updateProfile(user, { displayName: name });

            // save information in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                phone: phone,
                address: address,
                createdAt: Timestamp.now(),
            });

            console.log('Registered with:', user.email);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                alert('This email is already associated with an account.');
            } else {
                alert(error);
            }
        }
    };

    // function to format phone number
    const formatPhoneNumber = (text) => {
        // remove all non-numeric characters
        const cleaned = ('' + text).replace(/\D/g, '');

        // format number as ###-###-####
        const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (match) {
            return `${match[1]}${match[2] ? '-' + match[2] : ''}${match[3] ? '-' + match[3] : ''}`;
        }

        return text;
    }

    return (
        <GestureHandlerRootView style={{ flex:1 }}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Logo and Header */}
                <View style={styles.headerContainer}>
                    <Image 
                        source={require('../../assets/cart.png')}
                        style={styles.logo}
                    />
                    <Text style={styles.welcomeText}>Create Your Account</Text>
                    <Text style={styles.subText}>Fill in your details below to register!</Text>
                </View>

                <View style={styles.backButtonContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Icon name="arrow-back" size={24} color="#000" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Name"
                        value={name}
                        onChangeText={text => setName(text)}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Email"
                        value={email}
                        onChangeText={text => setEmail(text)}
                        style={styles.input}
                    />
                    <TextInput 
                        placeholder='Phone'
                        value={phone}
                        onChangeText={text => setPhone(formatPhoneNumber(text))}
                        style={styles.input}
                        keyboardType='phone-pad'
                        maxLength={12}
                    />
                    <TextInput 
                        placeholder='Address'
                        value={address}
                        onChangeText={text => setAddress(text)}
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
                        <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
                            <Ionicons name={passwordVisible ? "eye" : "eye-off"} size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.passwordContainer}>
                        <TextInput 
                            placeholder='Confirm Password'
                            value={confirmPassword}
                            onChangeText={text => setConfirmPassword(text)}
                            style={styles.passwordInput}
                            secureTextEntry={!confirmPasswordVisible}
                        />
                        <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}>
                            <Ionicons name={confirmPasswordVisible ? "eye" : "eye-off"} size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        onPress={handleSignUp}
                        style={styles.button}
                    >
                        <Text style={styles.buttonText}>Register</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingTop: 80,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 20,
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
    },
    subText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 15,
    },
    inputContainer: {
        width: '80%'
    },
    input: {
        backgroundColor: 'white',
        width: '100%',
        borderColor: '#ccc',
        padding: 10,
        marginTop: 5,
        borderRadius: 4,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        marginTop: 5,
        paddingHorizontal: 10,
        backgroundColor: 'white',
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    buttonContainer: {
        width: '60%',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40
    },
    button: {
        backgroundColor: '#0782F9',
        width: '100%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center'
    },
    buttonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16
    },
    backButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 40,
        left: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        marginLeft: 5,
    },
});