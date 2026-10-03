import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Network: undefined;
  Installations: undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  DeviceDetail: {
    ip: string;
    mac?: string;
    hostname?: string;
    vendor?: string;
    model?: string;
  };
  SshConsole: {
    ip: string;
    user?: string;
    port?: number;
    alias?: string;
  };
  QrScanner: undefined;
  NewInstallation: {
    step?: number;
    initialIp?: string;
    initialMac?: string;
  };
  PdfPreview: {
    filePath: string;
    title: string;
  };
  SyncQueue: undefined;
  SyncConflict: {
    conflictId: string;
  };
  AddCredential: {
    id?: string;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
