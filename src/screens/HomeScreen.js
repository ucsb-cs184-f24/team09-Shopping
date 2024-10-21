import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';

export default function HomeScreen() {
  const [shoppingList, setShoppingList] = useState([]);  // State for shopping list
  const [newItem, setNewItem] = useState('');  // State for new item input

  // Function to add a new item to the shopping list
  const addItemToList = () => {
    if (newItem.trim() === '') {
      Alert.alert('Error', 'Please enter an item');
      return;
    }

    // Add the new item to the shopping list and clear the input field
    setShoppingList([...shoppingList, { id: Date.now().toString(), name: newItem }]);
    setNewItem('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping List</Text>

      {/* Input field to add a new shopping item */}
      <TextInput
        style={styles.input}
        placeholder="Add a new item..."
        value={newItem}
        onChangeText={setNewItem}
      />

      {/* Button to add the item */}
      <Button title="Add Item" onPress={addItemToList} />

      {/* List of shopping items */}
      <FlatList
        data={shoppingList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f9f9f9',
    marginBottom: 5,
    borderRadius: 4,
  },
});
