import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CreateHouseholdScreen from '../src/screens/CreateHouseholdScreen';

jest.mock('../firebaseConfig', () => ({
    db: {},
    auth: {
      currentUser: {
        uid: 'testUserId',
      },
    },
}));

jest.mock('expo-font', () => ({
    useFonts: () => [true], // Mocking the useFonts hook to return true (meaning fonts are loaded)
    isLoaded: () => true, // Mock the isLoaded method to always return true
}));

jest.mock('@react-navigation/native', () => ({
    useFocusEffect: jest.fn(),

    // const mockFocusEffect = jest.fn((cb) => cb());
    // require('@react-navigation/native').useFocusEffect.mockImplementation(mockFocusEffect);
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    addDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ name: 'Mock User' }),
    }),
    onSnapshot: jest.fn((query, onNext) => {
        if (onNext) onNext({ docs: [] });
        return jest.fn(); // Mock unsubscribe
    }),
}));


describe('CreateHouseholdScreen', () => {
    it('renders the component without crashing', () => {
        const navigationMock = { navigate: jest.fn() };

        const { getByText } = render(
        <CreateHouseholdScreen navigation={navigationMock} />
        );

        // Verify basic rendering
        expect(getByText(/Welcome!/i)).toBeTruthy();
    });

    it('opens the modal when "Create Household" is pressed', () => {
        const navigationMock = { navigate: jest.fn() };
        const { getByText } = render(
            <CreateHouseholdScreen navigation={navigationMock} />
        );
    
        const createHouseholdButton = getByText(/Create Household/i);
        fireEvent.press(createHouseholdButton);
    
        // Check if modal content is visible
        expect(getByText(/Create a Household/i)).toBeTruthy();
    });    

    it('displays an error message if household name is empty', () => {
        const navigationMock = { navigate: jest.fn() };
        const { getByText, getByTestId } = render(
            <CreateHouseholdScreen navigation={navigationMock} />
        );
    
        // Open the modal first
        const openModalButton = getByText(/Create Household/i);
        fireEvent.press(openModalButton);
    
        // Then find and press the Create! button
        const createButton = getByText(/Create!/i);
        fireEvent.press(createButton);
    
        // Check for error message
        expect(getByText(/Household name is required./i)).toBeTruthy();
    });

    it('navigates to JoinHousehold screen when "Join a household" is pressed', () => {
        const navigationMock = { navigate: jest.fn() };
        const { getByText } = render(
            <CreateHouseholdScreen navigation={navigationMock} />
        );
    
        const joinButton = getByText(/Join a household/i);
        fireEvent.press(joinButton);
    
        expect(navigationMock.navigate).toHaveBeenCalledWith('JoinHousehold');
    });
});
