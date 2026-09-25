import open from 'open';

export type BrowserOpener = (url: string) => Promise<void>;

export const openInBrowser: BrowserOpener = async (url) => {
  await open(url);
};
