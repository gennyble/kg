if (!globalThis.browser) {
  globalThis.browser = chrome;
}

export async function fetchSettings() {
  const sessionObject = await browser.storage.local.get('session_token');
  const syncObject = await browser.storage.local.get('sync_existing');
  const privacyConsentObject =
    await browser.storage.local.get('privacy_consent');

  return {
    token: sessionObject?.session_token,
    sync_existing:
      typeof syncObject?.sync_existing !== 'undefined'
        ? syncObject.sync_existing
        : true,
    privacy_consent:
      typeof privacyConsentObject?.privacy_consent !== 'undefined'
        ? privacyConsentObject.privacy_consent
        : false,
  };
}

export async function getActiveTab(fetchingFromShortcut = false) {
  const tabsQuery = {
    active: true,
    lastFocusedWindow: true,
  };

  // Don't look just in the last focused window if we're opening from the shortcut
  if (fetchingFromShortcut) {
    tabsQuery.lastFocusedWindow = undefined;
  }

  const tabs = await browser.tabs.query(tabsQuery);

  // Chrome/Firefox might give us more than one active tab when something like "chrome://*" or "about:*" is also open
  const tab =
    tabs.find(
      (tab) =>
        tab?.url?.startsWith('http://') || tab?.url?.startsWith('https://'),
    ) || tabs[0];

  if (tab?.url?.startsWith('about:reader?url=')) {
    const newUrl = new URL(tab.url);
    tab.url = newUrl.searchParams.get('url');
  }

  if (!tab || !tab.url) {
    console.error('No tab/url found.');
    console.error(JSON.stringify(tabs));
    return null;
  }

  return tab;
}

export async function requestActiveTabPermission() {
  try {
    const granted = await browser.permissions.request({
      permissions: ['activeTab'],
    });
    if (!granted) {
      console.error('Permission not granted for activeTab.');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting activeTab permission:', error);
    return false;
  }
}
