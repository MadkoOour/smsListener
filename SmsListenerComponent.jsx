import {
  StyleSheet,
  Text,
  View,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import _ from 'lodash';
import SmsListener from 'react-native-android-sms-listener';
import SmsModule from './modules/SmsModule';
import SmsAndroid from 'react-native-get-sms-android';
import axios from 'axios'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import NetInfo from '@react-native-community/netinfo'; 
import BackgroundTimer from 'react-native-background-timer';

const targetUrl = 'https://damenpay.app/self_charge_ng/api/v1/selfcharge/NewMessage';

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
              simInfo.some(sim => sim.subscriptionId === message.sim_id || sim.subscriptionId === message.sub_id),
            );
  
            const newFilteredList = filteredMessages.map(msg => {
              const found = simInfo.find(sim => sim.subscriptionId === msg.sim_id || sim.subscriptionId === msg.sub_id);
              return {
                ...msg,
                reciever: found.phoneNumber,
              };
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
      const { originatingAddress, body } = message;
      setPhoneNumber(originatingAddress);
      setMessageBody(body);
      fetchSmsList(); // This will trigger the update of deviceNumber and smsList
    });
  
    return () => {
      subscription.remove();
    };
  }, [simInfo]);

  useEffect(() => {
    if (smsList.length > 0) {
      const lastSmsObject = smsList[0];
      setDeviceNumber(lastSmsObject.reciever);
      const finalInfo = {
        sender: phoneNumber || lastSmsObject?.address,
        msg: lastSmsObject?.body,
        sim_detail: lastSmsObject?.reciever,
      };
      sendOrStoreMessage(finalInfo);
    }
  }, [smsList]);

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

  const sendStoredMessages = async () => {
    console.log("In sendStoredMessages!");
    try {
      const storedMessages = await AsyncStorage.getItem('storedMessages');
      let messagesArray = storedMessages ? JSON.parse(storedMessages) : [];
      console.log("🚀 ~ sendStoredMessages ~ messagesArray:", messagesArray);
      
      if (messagesArray.length > 0) {
        const messagesToKeep = [];
  
        for (const message of messagesArray) {
          try {
            console.log("Attempting to send stored message:", message);
            const res = await axios.post(targetUrl, message, {
              headers: {
                'Content-Type': 'application/json',
              },
            });
  
            if (res.status === 200 || res.status === 201) {
              console.log("Message sent successfully:", res.data);
            } else {
              console.log(`Failed with status ${res.status}:`, res.data);
              messagesToKeep.push(message); // Keep this message if sending failed
            }
          } catch (error) {
            console.error("Error sending message:", error.message);
            messagesToKeep.push(message); // Keep this message if sending failed
          }
  
          // Update stored messages after each attempt
          await AsyncStorage.setItem('storedMessages', JSON.stringify(messagesToKeep));
        }
  
        if (messagesToKeep.length === 0) {
          await AsyncStorage.removeItem('storedMessages');
        }
      }
    } catch (error) {
      console.error('Failed to send stored messages:', error);
    }
  };
  

  const sendOrStoreMessage = async (message) => {
    try {
      // Check if the message has already been sent
      const lastMessageSent = await AsyncStorage.getItem('lastMessageSent');
      if (lastMessageSent === message.msg) {
        console.log("Message has already been sent, skipping...");
        return;  // Exit if the message has already been sent
      }

      const state = await NetInfo.fetch();
      
      if (state.isConnected) {
        try {
          const res = await axios.post(targetUrl, message, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (res.status === 200 || res.status === 201) {
            console.log("The message: " , message);
            console.log("Message sent successfully:", res.data);

            // Save the message as sent
            await AsyncStorage.setItem('lastMessageSent', message.msg);
          } else {
            console.log(`Failed with status ${res.status}:`, res.data);
            storeMessageLocally(message);
          }
        } catch (error) {
          if (error.response) {
            console.error("Error response data:", error.response.data);
          }
          console.error("Error sending message:", error.message);
          storeMessageLocally(message);
        }
        
      } else {
        console.log('No internet connection, storing message locally.');
        storeMessageLocally(message);
      }
    } catch (error) {
      console.error("🚀 ~ sendOrStoreMessage ~ Error checking connection:", error);
      // You may choose to store the message locally in case of any error in checking connection.
      storeMessageLocally(message);
    }
  };


  useEffect(() => {
    const intervalId = BackgroundTimer.setInterval(() => {
      sendStoredMessages();
    }, 300000);
  
    return () => {
      BackgroundTimer.clearInterval(intervalId);
    };
  }, []);

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
