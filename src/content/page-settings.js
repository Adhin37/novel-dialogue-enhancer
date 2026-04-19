import { logger } from "../shared/utils/logger.js";
import { ExtensionConfig } from "../shared/utils/extension-config.js";

const DEFAULT_SETTINGS = ExtensionConfig.DEFAULTS;

/**
 * Validate and coerce a raw storage value to a boolean.
 * @param {*} value
 * @param {boolean} defaultValue
 * @param {string} settingName
 * @return {boolean}
 */
export function validateBooleanSetting(value, defaultValue, settingName) {
  if (typeof value === "boolean") {
    logger.debug(`Setting ${settingName} is valid boolean`, { value });
    return value;
  }

  if (typeof value === "string") {
    const boolValue = value.toLowerCase() === "true";
    logger.debug(`Setting ${settingName} converted from string`, {
      original: value,
      converted: boolValue
    });
    return boolValue;
  }

  logger.warn(`Invalid ${settingName} setting, using default`, {
    invalidValue: value,
    type: typeof value,
    defaultValue
  });

  return defaultValue;
}

/**
 * Loads extension settings from chrome.storage.sync.
 * Returns a resolved settings object; never rejects.
 * @param {ErrorHandler} errorHandler
 * @return {Promise<{isExtensionPaused: boolean, preserveNames: boolean, fixPronouns: boolean}>}
 */
export function loadSettings(errorHandler) {
  logger.debug("Starting settings load process");

  return new Promise((resolve, reject) => {
    const settingsTimeout = setTimeout(() => {
      const timeoutError = new Error("Settings load timed out after 5 seconds");
      logger.error("Settings load timeout", { timeoutMs: 5000 });
      reject(timeoutError);
    }, 5000);

    chrome.storage.sync.get(
      ["isExtensionPaused", "preserveNames", "fixPronouns"],
      (data) => {
        clearTimeout(settingsTimeout);

        if (chrome.runtime.lastError) {
          const settingsError = new Error(
            `Settings load failed: ${chrome.runtime.lastError.message}`
          );
          logger.error("Chrome storage error during settings load", {
            error: chrome.runtime.lastError.message,
            requestedKeys: ["isExtensionPaused", "preserveNames", "fixPronouns"]
          });
          errorHandler.handleError(settingsError, "settings_load", {
            recoveryFunction: () => {
              logger.debug("Applied default settings after storage error", DEFAULT_SETTINGS);
              resolve({ ...DEFAULT_SETTINGS });
            }
          });
          return;
        }

        if (!data || typeof data !== "object") {
          const validationError = new Error("Invalid settings data format received");
          logger.error("Invalid settings data format", {
            data,
            type: typeof data,
            isNull: data === null,
            isUndefined: data === undefined
          });
          errorHandler.handleError(validationError, "settings_validation", {
            recoveryFunction: () => {
              logger.debug("Applied default settings after validation error", DEFAULT_SETTINGS);
              resolve({ ...DEFAULT_SETTINGS });
            }
          });
          return;
        }

        const loadedSettings = {
          isExtensionPaused: validateBooleanSetting(data.isExtensionPaused, false, "isExtensionPaused"),
          preserveNames: validateBooleanSetting(data.preserveNames, true, "preserveNames"),
          fixPronouns: validateBooleanSetting(data.fixPronouns, true, "fixPronouns")
        };

        logger.debug("Settings validation completed", {
          original: data,
          validated: loadedSettings,
          hasChanges: JSON.stringify(data) !== JSON.stringify(loadedSettings)
        });
        logger.success("Settings loaded and validated successfully", loadedSettings);
        resolve(loadedSettings);
      }
    );
  });
}

/**
 * Checks whether the current page's site is whitelisted.
 * @param {ErrorHandler} errorHandler
 * @return {Promise<boolean>}
 */
export function checkSitePermissions(errorHandler) {
  const url = window.location.href;
  const hostname = window.location.hostname;

  logger.debug("Starting site permission check", { url, hostname });

  return new Promise((resolve) => {
    const permissionTimeout = setTimeout(() => {
      const timeoutError = new Error("Whitelist check timed out");
      logger.error("Site permission check timeout", { timeoutMs: 8000, url });
      errorHandler.handleError(timeoutError, "permission_timeout", {
        recoveryFunction: () => {
          logger.debug("Recovering from permission timeout with false result");
          resolve(false);
        }
      });
    }, 8000);

    try {
      chrome.runtime.sendMessage({ action: "checkSitePermission", url }, (response) => {
        clearTimeout(permissionTimeout);

        if (chrome.runtime.lastError) {
          const permissionError = new Error(
            `Permission check failed: ${chrome.runtime.lastError.message}`
          );
          logger.error("Chrome runtime error during permission check", {
            error: chrome.runtime.lastError.message,
            url
          });
          errorHandler.handleError(permissionError, "permission_check", {
            recoveryFunction: () => {
              logger.debug("Recovering from runtime error with false result");
              resolve(false);
            }
          });
          return;
        }

        if (!response || typeof response !== "object") {
          const responseError = new Error("Invalid response from site permission check");
          logger.error("Invalid permission check response", { response, type: typeof response, url });
          errorHandler.handleError(responseError, "permission_response", {
            recoveryFunction: () => {
              logger.debug("Recovering from invalid response with false result");
              resolve(false);
            }
          });
          return;
        }

        const hasPermission = Boolean(response.hasPermission);
        logger.debug("Site permission check completed successfully", { hasPermission, hostname });

        if (hasPermission) {
          logger.success(`Site ${hostname} is whitelisted`);
        } else {
          logger.info(`Site ${hostname} is not whitelisted`);
        }

        resolve(hasPermission);
      });
    } catch (error) {
      clearTimeout(permissionTimeout);
      logger.error("Exception during permission check", { error: error.message, stack: error.stack, url });
      errorHandler.handleError(error, "permission_check_exception", {
        recoveryFunction: () => {
          logger.debug("Recovering from permission check exception with false result");
          resolve(false);
        }
      });
    }
  });
}
