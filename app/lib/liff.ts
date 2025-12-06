import liff from '@line/liff';

export type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

let liffId: string | null = null;
let liffInitialized = false;

export const initLiff = async (id: string): Promise<void> => {
  if (liffInitialized) {
    return;
  }
  
  liffId = id;
  await liff.init({ liffId: id });
  liffInitialized = true;
};

export const getProfile = async (): Promise<LiffProfile> => {
  if (!liffInitialized) {
    throw new Error('LIFF is not initialized');
  }
  
  const profile = await liff.getProfile();
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    statusMessage: profile.statusMessage,
  };
};

export const isInClient = (): boolean => {
  if (!liffInitialized) {
    return false;
  }
  return liff.isInClient();
};

export const isLoggedIn = (): boolean => {
  if (!liffInitialized) {
    return false;
  }
  return liff.isLoggedIn();
};

export const login = (): void => {
  if (!liffInitialized) {
    throw new Error('LIFF is not initialized');
  }
  liff.login();
};

export const logout = (): void => {
  if (!liffInitialized) {
    throw new Error('LIFF is not initialized');
  }
  liff.logout();
};

