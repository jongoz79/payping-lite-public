# Google Play Console — Data Safety Form Responses

**App Name:** PayPing Lite  
**Package Name:** `com.paypingmy.app`  
**Version:** 3.0.0  

This document provides exact question-by-question responses for the Google Play Console **Data safety** questionnaire.

---

## 1. Overview & Policy Basis

### Core Determination: **"No user data is collected or shared"**

Under Google Play's Data Safety definition:
> *"Data is 'collected' when an app transmits data off the user's device (e.g. to developer servers or third parties)."*  
> *"Data processed only ephemerally on-device or stored exclusively locally on the device without being transmitted off the device does NOT count as collection."*

PayPing Lite v3.0.0:
1. Makes **zero network requests** across the entire application lifecycle.
2. Contains **zero third-party tracking, analytics, or advertising SDKs** (no Firebase, no Google Analytics, no Facebook SDK, no Sentry, no AdMob).
3. Reads incoming notifications from user-selected apps solely via the local Android `NotificationListenerService` (`PayPingListenerService`), processes regex matching locally in memory, saves the parsed output into an on-device SQLite database (`payping.db`), and announces speech through the on-device Android `TextToSpeech` engine.
4. **Nothing leaves the user's phone.**

---

## 2. Play Console Questionnaire: Question-by-Question

### Section 1: Data Collection and Security

| Question | Answer | Reason / Policy Explanation |
|---|---|---|
| **Does your app collect or share any of the required user data types?** | **No** | The app processes data strictly on the device. No data is transmitted off the device to any server or third party. |
| **Is all of the user data collected by your app encrypted in transit?** | **N/A** (or Yes) | The app transmits zero data over the internet. There is no network traffic. |
| **Do you provide a way for users to request that their data is deleted?** | **Yes** | Users have full local control: they can tap "Delete All Data" in Settings anytime, or clear app storage via Android system settings, which permanently deletes the local SQLite database. |

---

### Section 2: Data Types Breakdown

Google asks whether specific categories of data are collected or shared. For all categories below, select **No**:

| Category | Data Type | Answer | Technical Explanation |
|---|---|---|---|
| **Location** | Approximate or Precise Location | **No** | App never accesses GPS or network location. |
| **Personal Info** | Name, Email, Address, Phone, User IDs | **No** | No user account, no registration, no contact info requested or collected. |
| **Financial Info** | Credit card, Bank account numbers, Payment history | **No** | Transaction amounts parsed from notifications are stored **only locally in the on-device SQLite file**. They are never transmitted off the device. |
| **Health & Fitness** | Health / Fitness info | **No** | Not accessed or processed. |
| **Messages** | Emails, SMS, Instant messages | **No** | App does not read SMS or instant messaging content. (Only notifications from user-selected packages are processed locally). |
| **Photos & Videos** | Photos or Videos | **No** | Not accessed. |
| **Audio Files** | Voice or sound recordings | **No** | App outputs synthesized speech via TextToSpeech; it does not record audio or microphones. |
| **Files & Docs** | Files or documents | **No** | When user chooses "Export CSV", it opens the standard Android system share sheet. The app does not collect user files. |
| **Calendar** | Calendar events | **No** | Not accessed. |
| **Contacts** | Contacts list | **No** | Not accessed. |
| **App Activity** | App interactions, In-app search, Installed apps | **No** | While the app queries the local launcher intent (`MAIN`/`LAUNCHER`) so the user can pick apps, this list is held in local memory/database only and never sent anywhere. |
| **Web Browsing** | Web browsing history | **No** | Not accessed. |
| **App Info & Performance** | Crash logs, Diagnostics, Performance metrics | **No** | No crash reporting or analytics SDK is included. Zero telemetry. |
| **Device or other IDs** | IMEI, MAC address, Advertising ID (AAID) | **No** | App does not collect or read advertising IDs or persistent hardware identifiers. |

---

## 3. Play Store Public Preview Summary

Once submitted, the public Data Safety section on the Google Play Store listing will display:

> ### **No data shared with third parties**  
> *The developer says this app doesn't share user data with other companies or organizations.*  
>  
> ### **No data collected**  
> *The developer says this app doesn't collect user data.*  
>  
> ### **Security practices**  
> - *Data can be deleted: You can delete all your stored data within the app.*

---

## 4. Play Console Review Notes (Optional Context Field)

If a Play Store reviewer requests clarification on why Notification Access is used without data collection:

> *"PayPing Lite is an on-device utility for small merchants that speaks payment notification alerts aloud via the Android TextToSpeech engine. Notification content from apps explicitly chosen by the user is processed and stored strictly within the local on-device SQLite database. The application has no internet communication capabilities, contains zero analytics/tracking SDKs, and transmits zero data off the device. Per Google Play Data Safety definitions, no user data is collected or shared."*
