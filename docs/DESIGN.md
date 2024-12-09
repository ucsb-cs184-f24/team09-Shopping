# Project Design Document

## 1. System Architecture Overview

### Architecture Diagram


Our project is built on **React Native** for the frontend with Firebase services providing backend functionalities. The architecture is composed of:

- **Frontend**: React Native components that handle UI, interactions, and navigation between screens.
- **Backend**: The backend uses Firebase for authentication, database management, and real-time syncing. It handles user sign-up, household management, shopping lists, and expense tracking using Firebase Authentication and Firestore.
- **Database**: Firestore is used for storing users, households, shopping lists, and balances, ensuring real-time data sync.

![IMG_0454](https://github.com/user-attachments/assets/2885d08a-70bd-4325-a2fb-7a7925bdc00c)
![IMG_0455](https://github.com/user-attachments/assets/3e38ae89-0dbb-46ec-b480-d28d23c61ff3)





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

Refer to detailed meeting notes in the GitHub repository: [
link](https://github.com/ucsb-cs184-f24/team09-Shopping/tree/main/team)
## 3. User Experience Considerations

### High-Level User Flow
- **Authentication**:
  - Users start at **LoginScreen.js** and either sign in or navigate to **RegisterScreen.js** for account creation.
- **Household Management**:
  - Users can create a household via **CreateHouseholdScreen.js** or join an existing one using **JoinHouseholdScreen.js**.
  - Once part of a household, users can view members in the household via **HouseholdDetailsScreen.js**.
- **Shopping and Expense Tracking**:
  - Users access **HomeScreen.js** to manage household shopping lists, add new items, and filter or edit items.
  - After shopping, expenses can be split via **BalancesScreen.js**, which ensures fair cost sharing.

### UI
- **Simplicity**: The UI is designed to make navigation intuitive, with clear buttons and minimal forms.

![IMG_4460](https://github.com/user-attachments/assets/3676b88f-1d72-4a63-9c90-3c13610627cc)
![IMG_4459](https://github.com/user-attachments/assets/1d1f51e5-1fe6-4078-acb9-3d5e7d92484d)
![IMG_4461](https://github.com/user-attachments/assets/0b702f1d-d130-411d-983b-5bd73b0b53ee)
![IMG_4462](https://github.com/user-attachments/assets/8d0fe836-3667-4f13-851f-a8f4391b6ee3)
![IMG_4463](https://github.com/user-attachments/assets/a0f0db74-ae45-4d3a-bb28-2d2c288d3cab)




## 4. Design and Process Documentation Overlap

- **Household Management**: Components like **CreateHouseholdScreen.js** and **JoinHouseholdScreen.js** were developed with both UX and process flow in mind, ensuring seamless onboarding.
- **Expense Tracking**: Work on **BalancesScreen.js** has overlap with team efforts on fair cost splitting and documentation of shared expenses to ensure accountability among household members.

The document will be updated as we continue to refine the system and UX based on feedback and new insights.

