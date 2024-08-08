import { StyleSheet, Text, View, Alert, Platform, PermissionsAndroid } from 'react-native';
import React, { useEffect, useState } from 'react';
import SmsListener from 'react-native-android-sms-listener';
import SmsModule from './modules/SmsModule';

const SmsListenerComponent = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deviceNumber, setDeviceNumber] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [simInfo, setSimInfo] = useState([]);

  // Request permissions on component mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          ]);

          if (granted['android.permission.READ_SMS'] !== PermissionsAndroid.RESULTS.GRANTED ||
              granted['android.permission.RECEIVE_SMS'] !== PermissionsAndroid.RESULTS.GRANTED ||
              granted['android.permission.READ_PHONE_STATE'] !== PermissionsAndroid.RESULTS.GRANTED) {
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
    const subscription = SmsListener.addListener(async message => {
      console.info('Received SMS:', message);

      if (message) {
        const { originatingAddress, body, subscriptionId } = message;
        setPhoneNumber(originatingAddress);
        setMessageBody(body);

        // Log subscriptionId and incoming SIM info
        console.log('Incoming SMS subscriptionId:', subscriptionId);
        console.log('Available SIM info:', simInfo);

        // Normalize phone numbers
        const normalizePhoneNumber = (number) => number.replace(/[^0-9]/g, '');
        const normalizedOriginatingAddress = normalizePhoneNumber(originatingAddress);

        // Extract phone numbers from SIM info
        const simInfoArray = simInfo.map(info => ({
          id: info.subscriptionId,
          number: normalizePhoneNumber(info.phoneNumber)
        }));
        console.log('SIM Info Array:', simInfoArray);

        // Match the subscription ID from the SMS with the SIM info
        const simInfoMatched = simInfoArray.find(info => info.id === subscriptionId);

        if (simInfoMatched) {
          setDeviceNumber(simInfoMatched.number);
        } else {
          setDeviceNumber('Not found');
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [simInfo]);

  console.log("🚀 ~ SmsListenerComponent ~ deviceNumber:", deviceNumber);
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
