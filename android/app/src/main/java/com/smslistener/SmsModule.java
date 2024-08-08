package com.smslistener;

import android.content.Context;
import android.os.Build;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.List;

public class SmsModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public SmsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SmsModule";
    }

    @ReactMethod
    public void getSimInfo(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                SubscriptionManager subscriptionManager = (SubscriptionManager) reactContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);

                if (subscriptionManager == null) {
                    Log.d("SmsModule", "SubscriptionManager is null");
                    promise.reject("Error", "SubscriptionManager not available");
                    return;
                }

                List<SubscriptionInfo> subscriptionInfoList = subscriptionManager.getActiveSubscriptionInfoList();
                Log.d("SmsModule", "SubscriptionInfo List: " + subscriptionInfoList);

                if (subscriptionInfoList == null || subscriptionInfoList.isEmpty()) {
                    promise.resolve("No SIM information available.");
                    return;
                }

                StringBuilder simInfo = new StringBuilder();
                for (SubscriptionInfo subscriptionInfo : subscriptionInfoList) {
                    int subscriptionId = subscriptionInfo.getSubscriptionId();
                    String phoneNumber;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        // Use the getPhoneNumber method for API level 30 and above
                        phoneNumber = subscriptionManager.getPhoneNumber(subscriptionId);
                    } else {
                        // Use the deprecated method for lower API levels
                        phoneNumber = subscriptionInfo.getNumber();
                    }
                    Log.d("SmsModule", "SIM Slot: " + subscriptionInfo.getSimSlotIndex() + ", Phone Number: " + phoneNumber);
                    simInfo.append("SIM Slot: ").append(subscriptionInfo.getSimSlotIndex()).append(", Phone Number: ").append(phoneNumber).append("\n");
                }
                promise.resolve(simInfo.toString());
            } else {
                promise.reject("Error", "SDK version not supported");
            }
        } catch (Exception e) {
            Log.d("SmsModule", "Exception: " + e.getMessage());
            promise.reject("Error", e.getMessage());
        }
    }
}
