import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { BarChart } from 'react-native-chart-kit';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { getISOWeek } from 'date-fns';

export default function SummaryPage() {
  const [households, setHouseholds] = useState([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');
  const [householdItems, setHouseholdItems] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [timeRange, setTimeRange] = useState('monthly');
  const [isTimeRangeDropdownOpen, setIsTimeRangeDropdownOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHouseholds = async () => {
      try {
        const userId = auth.currentUser.uid;
        const q = query(collection(db, 'households'), where('members', 'array-contains', userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const userHouseholds = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setHouseholds(userHouseholds);
          setHouseholdItems(
            userHouseholds.map((household) => ({
              label: household.displayHouseholdName
                ? household.displayHouseholdName
                : `Household ${household.id.substring(0, 6)}`,
              value: household.id,
            }))
          );
        });
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching households:', error);
      }
    };

    fetchHouseholds();
  }, []);

  useEffect(() => {
    if (!selectedHouseholdId) return;

    setLoading(true);
    const shoppingListsRef = collection(db, `households/${selectedHouseholdId}/shoppingLists`);
    const unsubscribe = onSnapshot(shoppingListsRef, (shoppingListsSnapshot) => {
      const allItems = [];
      shoppingListsSnapshot.forEach((listDoc) => {
        const itemsRef = collection(
          db,
          `households/${selectedHouseholdId}/shoppingLists/${listDoc.id}/items`
        );
        onSnapshot(itemsRef, (itemsSnapshot) => {
          const items = itemsSnapshot.docs
            .map((doc) => ({
              ...doc.data(),
              purchasedDate: doc.data().purchasedDate?.toDate(),
            }))
            .filter((item) => item.isPurchased && item.purchasedDate);

          allItems.push(...items);

          const processedData = processChartData(allItems, timeRange);
          setChartData(processedData);
          setLoading(false);
        });
      });
    });

    return () => unsubscribe();
  }, [selectedHouseholdId, timeRange]);
  
  const processChartData = (items, range) => {
    const groupedData = {};

    items.forEach((item) => {
      const date = item.purchasedDate;
      let key;

      if (range === 'weekly') {
        const weekNumber = getISOWeek(date);
        key = `${date.getFullYear()}-W${weekNumber}`;
      } else if (range === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (range === 'yearly') {
        key = `${date.getFullYear()}`;
      }

      groupedData[key] = (groupedData[key] || 0) + (item.cost || 0);
    });

    return Object.keys(groupedData).map((key) => ({
      label: key,
      value: groupedData[key],
    }));
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <FlatList
        data={[{ key: 'content' }]} // Dummy data to render content
        renderItem={() => (
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Summary</Text>

            {/* Dropdown for Household */}
            <DropDownPicker
              open={isDropdownOpen}
              value={selectedHouseholdId}
              items={householdItems}
              setOpen={setIsDropdownOpen}
              setValue={setSelectedHouseholdId}
              setItems={setHouseholdItems}
              placeholder="Select Household"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
            />

            {/* Card Container */}
            <View style={styles.card}>
              {loading ? (
                <Text style={styles.loadingText}>Loading...</Text>
              ) : chartData.length > 0 ? (
                <>
                  <View style={styles.chartContainer}>
                    <BarChart
                      data={{
                        labels: chartData.map((d) => d.label),
                        datasets: [{ data: chartData.map((d) => d.value) }],
                      }}
                      width={350} // Fixed width for chart
                      height={220}
                      chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 2,
                        color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                          borderRadius: 8,
                        },
                        propsForBackgroundLines: {
                          stroke: '#e3e3e3',
                        },
                        barPercentage: 0.7,
                      }}
                      style={styles.chart}
                    />
                  </View>

                  <DropDownPicker
                    open={isTimeRangeDropdownOpen}
                    value={timeRange}
                    items={[
                      { label: 'Weekly', value: 'weekly' },
                      { label: 'Monthly', value: 'monthly' },
                      { label: 'Yearly', value: 'yearly' },
                    ]}
                    setOpen={setIsTimeRangeDropdownOpen}
                    setValue={setTimeRange}
                    placeholder="Select Time Range"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                  />
                </>
              ) : (
                <Text style={styles.noDataText}>No data available for the selected range.</Text>
              )}
            </View>
          </View>
        )}
        keyExtractor={(item) => item.key}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  contentContainer: {
    margin: 16, // Add margin around the content
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdown: {
    marginBottom: 20,
    borderColor: '#ccc',
    height: 50,
    backgroundColor: '#fff',
  },
  dropdownContainer: {
    borderColor: '#ccc',
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  chart: {
    borderRadius: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
  },
});