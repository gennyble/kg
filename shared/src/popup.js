import {
  fetchSettings,
  requestActiveTabPermission,
} from './lib/utils.js';

if (!globalThis.browser) {
  globalThis.browser = chrome;
}

let IS_CHROME = true;

// Very hacky, but currently works flawlessly
if (typeof browser.runtime.getBrowserInfo === 'function') {
  IS_CHROME = false;
}

function setStatus(type) {
  const linksDiv = document.querySelector('#links');
  const statusElement = document.querySelector('#status');
  const statusPermissionMessageElement = document.querySelector(
    '#status_permission_message',
  );
  const statusErrorMessageElement = document.querySelector(
    '#status_error_message',
  );
  const statusLoadingMessageElement = document.querySelector(
    '#status_loading_message',
  );

  const statusIcons = statusElement.querySelectorAll('svg');

  const statusErrorIcon = statusIcons[0];
  const statusLoadingIcon = statusIcons[1];
  const statusGoodIcon = statusIcons[2];

  statusLoadingMessageElement.style.display = 'none';
  statusLoadingIcon.style.display = 'none';

  switch (type) {
    case 'no_session': {
      const openKagiLinkElement = document.querySelector('#open_kagi');

      openKagiLinkElement.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const grant = await browser.permissions.request({
          origins: ['https://kagi.com/*'],
        });
        if (grant) {
          browser.tabs.create({
            url: 'https://kagi.com/',
          });
        } else {
          statusPermissionMessageElement.style.display = '';
        }
      });

      linksDiv.style.visibility = 'hidden';
      statusErrorMessageElement.style.display = '';
      statusErrorIcon.style.display = '';
      statusGoodIcon.style.display = 'none';
      statusElement.setAttribute('title', 'No session found!');
      break;
    }
    case 'manual_token': {
      linksDiv.style.visibility = 'visible';
      statusErrorMessageElement.style.display = 'none';
      statusErrorIcon.style.display = 'none';
      statusGoodIcon.style.display = '';
      statusElement.setAttribute('title', 'Token found!');
      break;
    }
    case 'auto_token': {
      linksDiv.style.visibility = 'visible';
      statusErrorMessageElement.style.display = 'none';
      statusErrorIcon.style.display = 'none';
      statusGoodIcon.style.display = '';
      statusElement.setAttribute('title', 'Session found!');
      break;
    }
    default:
      break;
  }
}

async function setup() {
  const linksDiv = document.querySelector('#links');
  if (!linksDiv) {
    console.error('Could not find links div');
    return;
  }

  const privacyConsentDiv = document.querySelector('#privacy_consent_message');
  if (!privacyConsentDiv) {
    console.error('Could not find privacy div');
    return;
  }

  const privacyConsentButton = document.querySelector(
    '#privacy_consent_button',
  );
  if (!privacyConsentButton) {
    console.error('No privacy consent button found.');
    return;
  }

  const tokenDiv = document.querySelector('#token');
  if (!tokenDiv) {
    console.error('Could not find token div');
    return;
  }

  const tokenInput = document.querySelector('#token_input');
  if (!tokenInput) {
    console.error('Could not set token because no input exists');
    return;
  }

  tokenInput.addEventListener('focus', (event) => {
    event.target.select();
  });

  tokenInput.addEventListener('click', () =>
    this.value ? this.setSelectionRange(0, this.value.length) : null,
  );

  const advancedToggle = document.querySelector('#advanced');
  if (!advancedToggle) {
    console.error('Could not find advanced toggle');
    return;
  }

  const saveTokenButton = document.querySelector('#token_save');
  if (!saveTokenButton) {
    console.error('Could not find save settings button');
    return;
  }

  const saveErrorDiv = document.querySelector('#save_error');
  if (!saveErrorDiv) {
    console.error('Could not find save error div');
    return;
  }

  privacyConsentButton.addEventListener('click', async () => {
    try {
      await browser.runtime.sendMessage({
        type: 'save_token',
        privacy_consent: true,
      });
    } catch (error) {
      console.error(error);

      showSavingError();
    }
  });

  saveTokenButton.addEventListener('click', async () => {
    let token = tokenInput.value;

    if (token.startsWith('https://kagi.com')) {
      const url = new URL(token);
      token = url.searchParams.get('token');

      if (token) tokenInput.value = token;
    }

    saveTokenButton.innerText = 'Saving...';

    try {
      await browser.runtime.sendMessage({
        type: 'save_token',
        token
      });
    } catch (error) {
      console.error(error);

      showSavingError();
    }
  });

  async function toggleAdvancedDisplay(forceState) {
    const icons = advancedToggle.querySelectorAll('svg');
    const showSettingsIcon = icons[0];
    const closeSettingsIcon = icons[1];

    if (forceState === 'close' || tokenDiv.style.display === '') {
      showSettingsIcon.style.display = '';
      closeSettingsIcon.style.display = 'none';
      tokenDiv.style.display = 'none';
      advancedToggle.setAttribute('title', 'Advanced settings');
    } else {
      showSettingsIcon.style.display = 'none';
      closeSettingsIcon.style.display = '';
      tokenDiv.style.display = '';
      advancedToggle.setAttribute('title', 'Close advanced settings');
    }
  }
  advancedToggle.addEventListener('click', () => toggleAdvancedDisplay());

  async function handleGetData({
    token,
    sync_existing,
    privacy_consent,
  } = {}) {
    if ((privacy_consent || IS_CHROME) && token) {
      tokenInput.value = token;

      if (sync_existing) {
        setStatus('auto_token');
      } else {
        setStatus('manual_token');
      }

      const hasIncognitoAccess =
        await browser.extension.isAllowedIncognitoAccess();

      if (!hasIncognitoAccess) {
        const incognitoSection = document.querySelector('#incognito');

        if (!incognitoSection) {
          console.error('No incognito div to place text');
          return;
        }

        incognitoSection.style.display = '';

        const firefoxExtensionSection = document.querySelector('#firefox_ext');
        const chromeExtensionSection = document.querySelector('#chrome_ext');

        if (!IS_CHROME) {
          firefoxExtensionSection.style.display = '';
          chromeExtensionSection.style.display = 'none';
        } else {
          firefoxExtensionSection.style.display = 'none';
          chromeExtensionSection.style.display = '';
        }

        // NOTE: slight little hack to make the chrome://extensions link not be blocked.
        if (IS_CHROME) {
          const chromeLinkElement = document.querySelector('#chrome_link');
          if (chromeLinkElement) {
            chromeLinkElement.addEventListener('click', async () => {
              await browser.runtime.sendMessage({ type: 'open_extension' });
            });
          }
        }
      }
    } else if (!privacy_consent && !IS_CHROME) {
      setStatus('');
      privacyConsentDiv.style.display = '';
      tokenDiv.style.display = 'none';
      advancedToggle.style.display = 'none';
      saveErrorDiv.style.display = 'none';
      toggleAdvancedDisplay('close');
    } else {
      privacyConsentDiv.style.display = 'none';
      advancedToggle.style.display = '';
      setStatus('no_session');
    }
  }

  const fetchedSettings = await fetchSettings();
  await handleGetData(fetchedSettings);

  let savingButtonTextTimeout = undefined;

  function showSavingError() {
    saveTokenButton.innerText = 'Error saving!';

    if (savingButtonTextTimeout) {
      clearTimeout(savingButtonTextTimeout);
    }

    savingButtonTextTimeout = setTimeout(() => {
      saveTokenButton.innerText = 'Save settings';
    }, 2000);

    if (!IS_CHROME) {
      const incognitoNameSpan = saveErrorDiv.querySelector('span');
      if (incognitoNameSpan) {
        incognitoNameSpan.innerText = 'Run in Private Windows';
      }
    }

    saveErrorDiv.style.display = '';
  }

  browser.runtime.onMessage.addListener(async (data) => {
    if (data.type === 'synced') {
      setStatus('manual_token');
      saveTokenButton.innerText = 'Saved!';
      saveErrorDiv.style.display = 'none';
      advancedToggle.style.display = '';

      const newlyFetchedSettings = await fetchSettings();
      await handleGetData(newlyFetchedSettings);

      if (savingButtonTextTimeout) {
        clearTimeout(savingButtonTextTimeout);
      }

      savingButtonTextTimeout = setTimeout(() => {
        saveTokenButton.innerText = 'Save settings';
      }, 2000);

    } else if (data.type === 'reset') {
      setStatus('no_session');
      tokenDiv.style.display = 'none';
      advancedToggle.style.display = '';
      saveErrorDiv.style.display = 'none';
      toggleAdvancedDisplay('close');
    } else if (data.type === 'save-error') {
      showSavingError();
    }
  });


  // Close popup after clicking on top link
  linksDiv.querySelectorAll('a').forEach((anchor) =>
    anchor.addEventListener('click', () => {
      setTimeout(() => window.close(), 50); // Without this timeout, the browser opens a new window instead of a new tab
    }),
  );
}

document.addEventListener('DOMContentLoaded', setup);
