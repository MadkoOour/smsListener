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
import axios from 'axios'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import NetInfo from '@react-native-community/netinfo'; 

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

  // Fetch sims info 
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
        JSON.stringify({}),
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

  //store message in local storage
  const storeMessageLocally = async (message) => {
    try {
      const storedMessages = await AsyncStorage.getItem('storedMessages');
      const messagesArray = storedMessages ? JSON.parse(storedMessages) : [];
      messagesArray.push(message);
      await AsyncStorage.setItem('storedMessages', JSON.stringify(messagesArray));
      console.log('Message stored locally:', message);
    } catch (error) {
      console.error('Failed to store message locally:', error);
    }
  };

  // Function to send messages from local storage
  const sendStoredMessages = async () => {
    try {
      const storedMessages = await AsyncStorage.getItem('storedMessages');
      const messagesArray = storedMessages ? JSON.parse(storedMessages) : [];
      if (messagesArray.length > 0) {
        for (const message of messagesArray) {
          await axios.post('/selfCharge', message);
          console.log('Successfully sent stored message:', message);
        }
        // Clear the stored messages after sending
        await AsyncStorage.removeItem('storedMessages');
      }
    } catch (error) {
      console.error('Failed to send stored messages:', error);
    }
  };

  // Check connection and send or store the message
  const sendOrStoreMessage = async (message) => {
    const state = await NetInfo.fetch();
    if (state.isConnected) {
      axios.post('/selfCharge', message)
        .then(response => {
          console.log('Successfully sent to the backend:', response.data);
        })
        .catch(error => {
          console.error('Failed to send to the backend, storing message:', error);
          storeMessageLocally(message);
        });
    } else {
      console.log('No internet connection, storing message locally.');
      storeMessageLocally(message);
    }
  };

  useEffect(() => {
    const handleConnectionChange = state => {
      if (state.isConnected) {
        sendStoredMessages();
      }
    };

    const unsubscribe = NetInfo.addEventListener(handleConnectionChange);

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (phoneNumber && messageBody && deviceNumber) {
      const finalInfo = {
        sender: phoneNumber,
        messageBody: messageBody,
        reciever: deviceNumber,
      };
      console.log("🚀 ~ SmsListenerComponent ~ finalInfo:", finalInfo);

      sendOrStoreMessage(finalInfo);
    }
  }, [phoneNumber, messageBody, deviceNumber, smsList]);

  return (
    <View style={styles.container}>
      <Text>SMS Listener</Text>
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
