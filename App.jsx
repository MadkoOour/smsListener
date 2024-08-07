import { StyleSheet, Text, View, PermissionsAndroid, Platform } from 'react-native';
import React, { useEffect } from 'react';
import SmsListenerComponent from './SmsListenerComponent';

const App = () => {
  useEffect(() => {
    async function requestSmsPermission() {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            {
              title: "SMS Permission",
              message: "This app needs access to your SMS messages",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("You can receive SMS messages");
          } else {
            console.log("SMS permission denied");
          }
        }
      } catch (err) {
        console.warn(err);
      }
    }

    requestSmsPermission();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Hello App</Text>
      <SmsListenerComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
