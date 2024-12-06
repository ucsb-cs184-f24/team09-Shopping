# Team Contributions

## Anika
- Did an initial UI mockup to lay out design idea for app: https://app.uizard.io/prototypes/WOXy6dE4egClQodZLPBd/player/preview 
- Made an important commit in the beginning which helped set up the backend for the project, the github commit https://github.com/ucsb-cs184-f24/team09-Shopping/pull/48, the PR logged items to a database and set up the information frame that included the household and UserID within Firebase which closed issue #19 
- PR https://github.com/ucsb-cs184-f24/team09-Shopping/pull/48 also closed issue #20 by adding a category field that a user was required to separately fill out in addition to the item name, and the information was stored in Firebase database
- Recorded the MVP video screen recording and narration to present the product to the class
- Displayed the current household that the user is viewing within the "Add Items" page for better UI in https://github.com/ucsb-cs184-f24/team09-Shopping/pull/90
- Created custom bill splitting functionality where, once user selects members to split the bill with, they choose the custom amount for each member (which must sum up to item cost) and the information gets passed to the Balances backend
- Helped keep track of team progress in group chat by putting reminders out for important deadlines
- Tested and approved PRs
- Coordinated video recording for final presentation

## Kavya
- Set up Firebase https://github.com/ucsb-cs184-f24/team09-Shopping/pull/38 initially and implemented functionality to check off list items on the shopping list page https://github.com/ucsb-cs184-f24/team09-Shopping/pull/50
- Worked on brainstorming ideas for our app and providing ways to make the app more usable
- Implemeneted functionality for user to upload their profile picture https://github.com/ucsb-cs184-f24/team09-Shopping/pull/98
- Established design system to standardize design components and provide a seamless experience for the user.
- Conducted design experiments for the UI of the app. https://github.com/ucsb-cs184-f24/team09-Shopping/pull/78
- Created hi-fi design mockups through Figma: https://www.figma.com/design/Be6R1GrzOaWAKojh5b10Mi/CartShare-Specs?node-id=0-1&t=PmweGzcHVfQrD0QD-1
- Updated team members on my mockup designs and requested feedback from team members on mockups before implementation.
- Tested PRs and provided feedback on issues that needed to be resolved.
- Implemented the mockups for log in screen, register screen, home screen, balances screen, join household screen, household details screen, and profile screen. https://github.com/ucsb-cs184-f24/team09-Shopping/pull/98 https://github.com/ucsb-cs184-f24/team09-Shopping/pull/120 https://github.com/ucsb-cs184-f24/team09-Shopping/pull/137

## Lawrence
- Worked on the implementation and functionality of the Login and SignUp processes (PR https://github.com/ucsb-cs184-f24/team09-Shopping/pull/91, https://github.com/ucsb-cs184-f24/team09-Shopping/pull/44)
- Set up the base features and handling of the Profile Page, where it displays the user information inputted when creating an account. Also made this information  editable for users. Included options for users to sign out and delete their accounts, with correct messages confirming their actions (PR https://github.com/ucsb-cs184-f24/team09-Shopping/pull/68, https://github.com/ucsb-cs184-f24/team09-Shopping/pull/124)
- Organized the database logic (Firestore) for users to create/join households i.e. codes as well as display basic information of the households (# members, name of household), made sure every household would be distinct from each other (PR https://github.com/ucsb-cs184-f24/team09-Shopping/pull/61, https://github.com/ucsb-cs184-f24/team09-Shopping/pull/70)
- Set up Record Payment i.e. cash or PayPal (via webview) as well as the logic in calculating/displaying the respective user's debts (PR https://github.com/ucsb-cs184-f24/team09-Shopping/pull/119, https://github.com/ucsb-cs184-f24/team09-Shopping/pull/131)
- Did code reviews on many of the member's respective pull requests, manually testing their implementations on my personal device

## Owen
- Created the initial version of Login Screen
- Set-up Firebase Configuration and auth
- Created the app navigation structure
- Implemented and created the backend schema for the Shopping Lists
- Implemented the scanning QR code to join a household feature
- Fixed bugs in the Shopping List screen
- Implemented unit tests for login and Create Household screen
- Created the UI for the Shopping List screen

## Wenxuan
- Create basic shopping list ui frontend and ui. Users can add a named item to the shopping list.
- Implement a filter feature for the shopping list. Users can filter out the list items by category. The category list options are dynamicly updated with the shopping list.
- Implement the edit/delete functionality. Users can swipe left on each shopping list and choose to edit or delete each item.
- Build a Summary page where users can see an overview of all the items they purchased in the households. Users can set the summary period to weekly/monthly/yearly and get a detailed histogram and pie chart representing the cost they spent and cost ratio on differen categories.
- Refine overall UI details and specific code logics, such as adding an item with price being optional.

## Kenisha
- Built the Balances screen, implementing core features to manage transaction history, real-time balance updates, and net balances. This feature works on the transaction history which is a list of all past transactions and net balances is a summary that shows who owes whom and how much.
- Developed pin/unpin functionality to enhance shopping list usability. Managed state changes, and Firestore updates, and introduced a visual indicator to improve user navigation.
- Implemented profile picture persistence to ensure images remain intact after the app reloads, significantly enhancing user experience.
- Worked on splitting the bill feature with equal cost distribution, making expense sharing intuitive and easy.
- I worked on documentation like the design document, the user manual, and the product backlog, I also 2 retrospectives.
- I had a total of 7 PRs that I worked on (15 Issues) and reviewed over 15 PRs
