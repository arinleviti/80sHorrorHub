export {};
interface SilktideManager {
  showPreferences: () => void;
  reset: () => void;
}
declare global {
  interface Window {
    silktideConsentManager?: SilktideManager;
    };
  }
