import {
  StyleSheet,
  Text,
  View,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import React, {useEffect, useState} from 'react';
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
        JSON.stringify({}), // Empty filter to get all SMS
        fail => {
          console.log('Failed with this error: ' + fail);
        },
        (count, smsList) => {
          const arr = JSON.parse(smsList);

          if (simInfo?.length > 0) {
            const filteredMessages = arr.filter(message =>
              simInfo.some(sim => sim.subscriptionId === message.sim_id),
            );
            
            const newFilteredList = filteredMessages.map(msg => {
              const founded = simInfo.find(sim => sim.subscriptionId === msg.sim_id);
              return {
                ...msg,
                reciever: founded.phoneNumber
              }
            });
            setSmsList(newFilteredList);
          }
        },
      );
    };

    if (simInfo.length > 0) {
      fetchSmsList();
    }

    const subscription = SmsListener.addListener(async message => {
      const {originatingAddress, body} = message;
      setPhoneNumber(originatingAddress);
      setMessageBody(body);
      fetchSmsList();
    });

    return () => {
      subscription.remove();
    };
  }, [simInfo]);

  useEffect(() => {
    if (smsList.length > 0) {
      const lastSmsObject = smsList[0];
      setDeviceNumber(lastSmsObject.reciever);
      console.log('Last SMS Object: ', JSON.stringify(lastSmsObject));
      console.log('Updated Device Number: ', lastSmsObject.reciever);
    }
  }, [smsList]);

  useEffect(() => {
    if (phoneNumber && messageBody && deviceNumber) {
      const finalInfo = {
        sender: phoneNumber,
        messageBody: messageBody,
        reciever: deviceNumber,
      };
      console.log("🚀 ~ SmsListenerComponent ~ finalInfo:", finalInfo);
    }
  }, [phoneNumber, messageBody, deviceNumber]);
  
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
