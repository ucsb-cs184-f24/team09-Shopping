import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../src/screens/LoginScreen';

beforeEach(() => {
  global.alert = jest.fn(); // Mock alert
});

afterEach(() => {
  jest.clearAllMocks(); // Clear all Jest mocks
  delete global.alert; // Remove the alert mock to restore the original
});

// Mock the Font module from expo-font to prevent issues with loading fonts during tests
jest.mock('expo-font', () => ({
  useFonts: () => [true], // Mocking the useFonts hook to return true (meaning fonts are loaded)
  isLoaded: () => true, // Mock the isLoaded method to always return true
}));

// Mock AsyncStorage
// jest.mock('@react-native-async-storage/async-storage', () => ({
//   setItem: jest.fn(() => Promise.resolve(null)),
//   getItem: jest.fn(() => Promise.resolve(null)),
//   removeItem: jest.fn(() => Promise.resolve(null)),
//   clear: jest.fn(() => Promise.resolve(null)),
//   getAllKeys: jest.fn(() => Promise.resolve([])),
//   multiGet: jest.fn(() => Promise.resolve([])),
//   multiSet: jest.fn(() => Promise.resolve(null)),
//   multiRemove: jest.fn(() => Promise.resolve(null)),
// }));

// Mock Firebase Config
jest.mock('../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { email: 'test@example.com' } })),
}));

describe('LoginScreen', () => {
  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={{ navigate: jest.fn() }} />);

    // Check if the email input, password input, and login button are rendered
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
  });

  it('allows text input for email and password', () => {
    const { getByPlaceholderText } = render(<LoginScreen navigation={{ navigate: jest.fn() }} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('calls the login function when the Login button is pressed', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen navigation={{ navigate: jest.fn() }} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Login');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await expect(require('firebase/auth').signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.any(Object),
      'test@example.com',
      'password123'
    );
  });

  it('navigates to the Register screen when "Sign up here!" is pressed', () => {
    const mockNavigate = jest.fn();
    const { getByText } = render(<LoginScreen navigation={{ navigate: mockNavigate }} />);

    const signUpText = getByText('New User? Sign up here!');
    fireEvent.press(signUpText);

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('shows an alert when signInWithEmailAndPassword fails with invalid credentials', async () => {
    const error = { code: 'auth/invalid-email' };
    require('firebase/auth').signInWithEmailAndPassword.mockRejectedValueOnce(error);

    const { getByText, getByPlaceholderText } = render(<LoginScreen navigation={{ navigate: jest.fn() }} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Login');

    // Case 1: Both email and password are missing
    fireEvent.changeText(emailInput, '');
    fireEvent.changeText(passwordInput, '');
    fireEvent.press(loginButton);

    await new Promise((r) => setTimeout(r, 0));

    expect(require('firebase/auth').signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        '',
        ''
    );
    expect(global.alert).toHaveBeenCalledWith("Please enter both email and password.");

    // Case 2: Only email is missing
    fireEvent.changeText(emailInput, '');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await new Promise((r) => setTimeout(r, 0));

    expect(require('firebase/auth').signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        '',
        ''
    );
    expect(global.alert).toHaveBeenCalledWith("Please enter both email and password.");

    // Case 3: Only password is missing
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, '');
    fireEvent.press(loginButton);

    await new Promise((r) => setTimeout(r, 0));

    expect(require('firebase/auth').signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        '',
        ''
    );
    expect(global.alert).toHaveBeenCalledWith("Please enter both email and password.");
  });

  it('shows an alert when signInWithEmailAndPassword fails with invalid credentials', async () => {
    const error = { code: 'auth/invalid-credential' };
    require('firebase/auth').signInWithEmailAndPassword.mockRejectedValueOnce(error);

    const { getByText, getByPlaceholderText } = render(<LoginScreen navigation={{ navigate: jest.fn() }} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Login');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await new Promise((r) => setTimeout(r, 0));

    expect(require('firebase/auth').signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com',
        'wrongpassword'
    );
    expect(global.alert).toHaveBeenCalledWith("Your password is incorrect or this account doesn't exist. Please try again.");
  });

  it('shows an alert with the error message for unexpected errors', async () => {
    const error = { message: 'Unexpected error occurred.' }; // Simulate an unexpected error
    require('firebase/auth').signInWithEmailAndPassword.mockRejectedValueOnce(error);

    const { getByText, getByPlaceholderText } = render(<LoginScreen navigation={{ navigate: jest.fn() }} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Login');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await new Promise((r) => setTimeout(r, 0)); // Wait for async updates

    expect(require('firebase/auth').signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com',
        'password123'
    );
    expect(global.alert).toHaveBeenCalledWith('Unexpected error occurred.');
  });

  describe('LoginScreen Password Visibility', () => {
    it('toggles password visibility when the eye icon is pressed', () => {
        const { getByPlaceholderText, getByTestId } = render(
            <LoginScreen navigation={{ navigate: jest.fn() }} />
        );

        // Find the password input and eye icon button
        const passwordInput = getByPlaceholderText('Password');
        const eyeIconButton = getByTestId('passwordToggle');

        // Initially, the password should be hidden
        expect(passwordInput.props.secureTextEntry).toBe(true);

        // Toggle visibility by pressing the eye icon
        fireEvent.press(eyeIconButton);

        // Password should now be visible
        expect(passwordInput.props.secureTextEntry).toBe(false);

        // Toggle visibility back
        fireEvent.press(eyeIconButton);

        // Password should be hidden again
        expect(passwordInput.props.secureTextEntry).toBe(true);
    });
  });
});
