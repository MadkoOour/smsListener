import { StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import SmsListener from 'react-native-android-sms-listener';

const SmsListenerComponent = () => {
  useEffect(() => {
    const subscription = SmsListener.addListener(message => {
      console.info('Received SMS:', message); // Ensure this logs in the console
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text>SmsListener</Text>
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
