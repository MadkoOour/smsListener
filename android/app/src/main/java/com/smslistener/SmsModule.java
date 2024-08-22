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
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

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

                WritableArray simInfoArray = Arguments.createArray();
                for (SubscriptionInfo subscriptionInfo : subscriptionInfoList) {
                    int subscriptionId = subscriptionInfo.getSubscriptionId();
                    String phoneNumber = null;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        phoneNumber = subscriptionManager.getPhoneNumber(subscriptionId);
                    } else {
                        phoneNumber = subscriptionInfo.getNumber();
                    }
                    Log.d("SmsModule", "SIM Slot: " + subscriptionInfo.getSimSlotIndex() + ", Phone Number: " + phoneNumber);

                    WritableMap simInfoMap = Arguments.createMap();
                    simInfoMap.putInt("subscriptionId", subscriptionId);
                    simInfoMap.putInt("simSlotIndex", subscriptionInfo.getSimSlotIndex());
                    simInfoMap.putString("phoneNumber", phoneNumber);

                    simInfoArray.pushMap(simInfoMap);
                }
                promise.resolve(simInfoArray);
            } else {
                promise.reject("Error", "SDK version not supported");
            }
        } catch (Exception e) {
            Log.d("SmsModule", "Exception: " + e.getMessage());
            promise.reject("Error", e.getMessage());
        }
    }
}
