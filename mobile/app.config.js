const IS_PROD = process.env.APP_ENV === 'production';

export default {
  expo: {
    name: IS_PROD ? "TimeTrack" : "TimeTrack Dev",
    slug: "time-tracker-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon-webapp.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    scheme: "time-track",
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_PROD ? "com.whoismidlaj.timetrack" : "com.whoismidlaj.timetrack.dev"
    },
    android: {
      package: IS_PROD ? "com.whoismidlaj.timetrack" : "com.whoismidlaj.timetrack.dev",
      adaptiveIcon: {
        foregroundImage: "./assets/icon-webapp.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      apiUrl: IS_PROD ? "https://timetracker.onlyfrens.fun/api" : "http://192.168.1.43:5000/api"
    },
    plugins: [
      "expo-router",
      "@react-native-google-signin/google-signin"
    ]
  }
};
