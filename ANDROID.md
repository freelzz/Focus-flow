# Making the FocusFlow Android app (APK/AAB)

FocusFlow is packaged for Android with Capacitor. The app stays fully offline —
everything is bundled into the app itself.

## What you need on your computer (one time)

1. **Node.js 20+**
2. **Android Studio** (includes the Android SDK)
3. **Java JDK 21** (bundled with recent Android Studio)

## Steps

```bash
npm install
npm run build              # builds the static SPA into .output/public
npm run android:sync       # rebuild + copy the app into the native project
npm run android:open       # opens Android Studio
```

In Android Studio:

- **Build → Build Bundle(s)/APK(s) → Build APK(s)** for a test APK
  (`android/app/build/outputs/apk/debug/app-debug.apk`)
- **Build → Generate Signed Bundle / APK → APK** for the store build.
  Create a keystore the first time and keep it safe — you need the same one for
  every future update.

The Amazon Appstore accepts a **signed release APK**. Upload it at
<https://developer.amazon.com/apps-and-games>, along with the app icon,
screenshots, and description.

## Command line alternative

```bash
cd android
./gradlew assembleRelease     # unsigned/release APK
```

## App identity

- App name: **FocusFlow**
- Package id: `app.focusflow.mobile` (change it in `capacitor.config.ts` before
  the first `cap add android` if you want a different one)

## Notes

- The packaged build lives in `.output/public` and is produced by the normal
  `npm run build`: `vite.config.ts` puts TanStack Start in SPA mode, so the app
  shell is prerendered to `index.html` and every route renders on the client —
  no server is needed inside the APK. Run `npm run android:sync` after any
  change to the app so the native project picks it up.
- Timer accuracy: the countdown is stored as a real end-time on the device
  clock, so locking the screen or closing the app never drifts. On reopening,
  any session that finished while you were away is settled immediately.
- Sounds are generated in-app (no audio files) and can be turned off in
  Settings → Sound.
