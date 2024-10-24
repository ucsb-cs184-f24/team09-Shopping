import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useNavigation } from '@react-navigation/native';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const RegisterScreen = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const navigation = useNavigation();

    const handleSignUp = async () => {
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
                password: password,
                createdAt: new Date(),
            });

            console.log('Registered with:', user.email);
            navigation.navigate('Home');
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
        >
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
        </KeyboardAvoidingView>
    );
};

export default RegisterScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
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
});