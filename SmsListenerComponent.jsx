import { StyleSheet, Text, View, Alert, Platform, PermissionsAndroid } from 'react-native';
import React, { useEffect, useState } from 'react';
import SmsListener from 'react-native-android-sms-listener';
import SmsModule from './modules/SmsModule';
import SmsAndroid from 'react-native-get-sms-android';

const SmsListenerComponent = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deviceNumber, setDeviceNumber] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [simInfo, setSimInfo] = useState([]);
  const [smsList, setSmsList] = useState([]);

  // Request permissions on component mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
          ]);

          if (granted['android.permission.READ_SMS'] !== PermissionsAndroid.RESULTS.GRANTED ||
              granted['android.permission.RECEIVE_SMS'] !== PermissionsAndroid.RESULTS.GRANTED ||
              granted['android.permission.READ_PHONE_STATE'] !== PermissionsAndroid.RESULTS.GRANTED ||
              granted['android.permission.READ_PHONE_NUMBERS'] !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permissions not granted', 'Please grant all required permissions.');
          }
        } catch (err) {
          console.warn(err);
        }
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    const fetchSimInfo = async () => {
      try {
        const simInfo = await SmsModule.getSimInfo();
        setSimInfo(simInfo);
        console.info('SIM Info:', simInfo);
      } catch (error) {
        console.error('Failed to get SIM info', error);
        Alert.alert('Error', 'Failed to get SIM info');
      }
    };

    fetchSimInfo();
  }, []);

  useEffect(() => {
    const fetchSmsList = () => {
      SmsAndroid.list(
        JSON.stringify({
          
        }), // Empty filter to get all SMS
        (fail) => {
          console.log('Failed with this error: ' + fail);
        },
        (count, smsList) => {
          console.log('Count: ', count);
          const arr = JSON.parse(smsList);

          // Filter messages manually by sim_id (assuming sub_id represents sim_id)
          const filteredMessages = arr.filter(message => message.sim_id === 1); // Change 1 to the appropriate SIM ID
          console.log('Filtered List:', filteredMessages);

          setSmsList(filteredMessages);
        }
      );
    };

    // Fetch SMS list only after SIM info is fetched
    if (simInfo.length > 0) {
      fetchSmsList();
    }

    // Listen for incoming SMS
    const subscription = SmsListener.addListener(async message => {
      console.info('Received SMS:', message);
      const { originatingAddress, body } = message;
      setPhoneNumber(originatingAddress);
      setMessageBody(body);
      // Fetch and update SMS list when a new message is received
      fetchSmsList();
    });

    return () => {
      subscription.remove();
    };
  }, [simInfo]); // Only trigger when simInfo is updated

  useEffect(() => {
    // Log the updated SMS list whenever it changes
    smsList.forEach((object) => {
      console.log('SMS Object: ' + JSON.stringify(object));
    });
  }, [smsList]);

  return (
    <View style={styles.container}>
      <Text>SmsListener</Text>
      <Text>Sender: {phoneNumber}</Text>
      <Text>Message: {messageBody}</Text>
      <Text>Device Number: {deviceNumber}</Text>
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

export default SmsListenerComponent;
