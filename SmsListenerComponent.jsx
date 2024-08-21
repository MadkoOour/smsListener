import {
  StyleSheet,
  Text,
  View,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import React, {useEffect, useState, useRef} from 'react';
import _ from 'lodash';
import SmsListener from 'react-native-android-sms-listener';
import SmsModule from './modules/SmsModule';
import SmsAndroid from 'react-native-get-sms-android';
import axios from 'axios'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import NetInfo from '@react-native-community/netinfo'; 


const targetUrl = 'https://damenpay.app/self_charge_ng/api/v1/selfcharge/NewMessage'
let effectCounter = 0;  // Initialize the counter

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
              const found = simInfo.find(sim => sim.subscriptionId === msg.sim_id);
              return {
                ...msg,
                reciever: found.phoneNumber,
              };
            });
  
            setSmsList(newFilteredList);
            if (newFilteredList.length > 0) {
              const lastSmsObject = newFilteredList[0];
              setPhoneNumber(lastSmsObject.address);
              setMessageBody(lastSmsObject.body);
              setDeviceNumber(lastSmsObject.reciever);
            }
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
      console.log('Last SMS Object: ', JSON.stringify(lastSmsObject));
      console.log('Updated Device Number: ', lastSmsObject.reciever);
    }
  }, [smsList]);

  //store message in local storage
  const storeMessageLocally = async (message) => {
    try {
      const storedMessages = await AsyncStorage.getItem('storedMessages');
      const messagesArray = storedMessages ? JSON.parse(storedMessages) : [];
      console.log("🚀 ~ storeMessageLocally ~ messagesArray:", messagesArray)
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
      let messagesArray = storedMessages ? JSON.parse(storedMessages) : [];
      // console.log("🚀 ~ sendStoredMessages ~ messagesArray:", messagesArray);
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
            if (error.response) {
              console.error("Error response data:", error.response.data);
            }
            console.error("Error sending message:", error.message);
            messagesToKeep.push(message); // Keep this message if sending failed
          }
        }

        if (messagesToKeep.length > 0) {
          await AsyncStorage.setItem('storedMessages', JSON.stringify(messagesToKeep));
        } else {
          await AsyncStorage.removeItem('storedMessages');
        }
      }
    } catch (error) {
      console.error('Failed to send stored messages:', error);
    }
  };

  // Check connection and send or store the message
  const sendOrStoreMessage = async (message) => {
    try {
      const state = await NetInfo.fetch();
      
      if (state.isConnected) {
        // console.log('sendOrStoreMessage connected ..............!', message);
  
        try {
          const res = await axios.post(targetUrl, message, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (res.status === 200 || res.status === 201) {
            console.log("The message: " , message)
            console.log("Message sent successfully:", res.data);
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

  const sendDebouncedMessage = useRef(_.debounce((finalInfo) => {
    sendOrStoreMessage(finalInfo);
  }, 300)).current;

  useEffect(() => {
    if (phoneNumber && messageBody && deviceNumber) {
      effectCounter++;  // Increment the counter
      console.log("useEffect triggered count:", effectCounter);      
      const finalInfo = {
        sender: phoneNumber,
        msg: messageBody,
        sim_detail: deviceNumber,
      };

      sendDebouncedMessage(finalInfo);
    }
  }, [phoneNumber, messageBody, deviceNumber]);


  useEffect(() => {
    setInterval(sendStoredMessages, 60000); 
    // return () => clearInterval(interval);
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
