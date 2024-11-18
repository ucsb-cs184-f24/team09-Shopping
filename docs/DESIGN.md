# Project Design Document

## 1. System Architecture Overview

### Architecture Diagram


Our project is built on **React Native** for the frontend with Firebase services providing backend functionalities. The architecture is composed of:

- **Frontend**: React Native components that handle UI, interactions, and navigation between screens.
- **Backend**: Firebase services such as **Firestore** (for database), **Firebase Authentication** (for user authentication), and **Cloud Storage** (for user data).
- **Database**: Firestore is used for storing users, households, shopping lists, and balances, ensuring real-time data sync.
- **Navigation**: React Navigation handles in-app navigation between different screens.

The application consists of various components:
1. **Authentication Flow**:
   - **LoginScreen.js** and **RegisterScreen.js** handle user sign-in and registration with Firebase Authentication.
   - Firebase handles secure login and registration, including password management.
  
2. **Household Management**:
   - **CreateHouseholdScreen.js** allows users to create households and generate unique household codes.
   - **JoinHouseholdScreen.js** enables users to join a household using a code or QR scan.
   - **HouseholdDetailsScreen.js** displays information about the household, members, and allows the user to leave the household.

3. **Shopping and Expenses Management**:
   - **HomeScreen.js** provides access to household shopping lists. Users can add, edit, and delete items.
   - **BalancesScreen.js** tracks shared expenses and calculates balances to split costs evenly between household members.

## 2. Important Team Decisions

- Decided on Firebase as our backend solution due to its seamless integration with React Native and real-time syncing capabilities.
- Agreed to use QR codes for easy household joining. Implemented in **JoinHouseholdScreen.js**.
- Updated UI to improve accessibility by ensuring that navigation buttons are intuitive and elements are optimized for different screen sizes.

Refer to detailed meeting notes in the GitHub repository: 

## 3. User Experience (UX) Considerations

### High-Level User Flow
- **Authentication**:
  - Users start at **LoginScreen.js** and either sign in or navigate to **RegisterScreen.js** for account creation.
- **Household Management**:
  - Users can create a household via **CreateHouseholdScreen.js** or join an existing one using **JoinHouseholdScreen.js**.
  - Once part of a household, users are directed to the **HouseholdDetailsScreen.js** to view members and shared shopping lists.
- **Shopping and Expense Tracking**:
  - Users access **HomeScreen.js** to manage household shopping lists, add new items, and filter or edit items.
  - After shopping, expenses can be split via **BalancesScreen.js**, which ensures fair cost sharing.

### UX Goals
- **Simplicity**: The UI is designed to make navigation intuitive, with clear buttons and minimal forms.
- **Accessibility**: Color contrast and button sizes are chosen to cater to a broad range of users.
- **User Guidance**: The user is guided through each flow step-by-step, such as signing up, joining a household, or adding items.

## 4. Design and Process Documentation Overlap

- **Household Management**: Components like **CreateHouseholdScreen.js** and **JoinHouseholdScreen.js** were developed with both UX and process flow in mind, ensuring seamless onboarding.
- **Expense Tracking**: Work on **BalancesScreen.js** has overlap with team efforts on fair cost splitting and documentation of shared expenses to ensure accountability among household members.

The document will be updated as we continue to refine the system and UX based on feedback and new insights.

