# Privacy Policy for Novel Dialogue Enhancer

**Effective Date:** 2025-05-17  
**Last Updated:** 2025-05-24

Thank you for using **Novel Dialogue Enhancer** (the "Extension"). Your privacy is important to us. This Privacy Policy explains what information the Extension collects, how it is used, and your rights regarding your data.

## 1. Information Collection and Use

### What We DON'T Collect

The Extension **does not collect**, store, or transmit any personally identifiable information (PII) or user data to external servers. Specifically:

- **No browsing history** is collected or stored
- **No personal credentials** are accessed or transmitted
- **No text content** from web pages is sent to external services
- **No user analytics** or tracking data is collected
- **No account information** is required or stored

### What We DO Store Locally

The Extension stores the following data **locally in your browser only**:

- **User Preferences**: Your extension settings (AI model selection, processing parameters, theme preferences)
- **Whitelist Data**: List of websites you've approved for enhancement
- **Character Analysis**: Information about detected characters in novels (names, genders, appearance counts) for consistency across chapters
- **Novel Metadata**: Basic information about novels you've read (titles, chapter numbers, processing statistics)
- **Usage Statistics**: Local counts of paragraphs processed, characters detected, and processing time (for your reference only)

All this data is stored using Chrome's built-in extension storage and never leaves your device.

## 2. Local AI Processing

### Ollama Integration

This extension integrates with **Ollama**, a locally-hosted AI service that runs on your machine:

- **Local Processing Only**: All AI enhancement happens on your computer via Ollama
- **No Cloud Services**: No text is sent to external AI services or cloud platforms
- **User Control**: You control which AI models are installed and used
- **No External Dependencies**: The extension functions entirely offline once Ollama is set up

### Data Flow

1. Text is processed locally by your browser
2. Character analysis happens within the extension
3. Text enhancement requests are sent to your local Ollama installation
4. Enhanced text is returned and displayed in your browser
5. No data ever leaves your local machine

## 3. Permissions Explanation

The Extension requests the following permissions for functionality:

### Required Permissions

- **`storage`** – To save your preferences, whitelist, and character data locally in Chrome's extension storage
- **`activeTab`** – To access the currently active tab for processing novel content when you explicitly request enhancement
- **`scripting`** – To inject scripts required for dialogue enhancement functionality

### Optional Permissions

- **`host_permissions`** – To access specific novel websites that you manually add to your whitelist
- **`optional_host_permissions`** – Allows you to grant permission for additional websites as needed

### How Permissions Are Used

- **Website Access**: Only used on sites you explicitly whitelist through the extension interface
- **Content Reading**: Only reads text content for enhancement purposes, never personal information
- **Local Storage**: Only stores preferences and analysis data locally, never transmitted externally
- **Script Injection**: Only injects enhancement functionality, never tracking or data collection scripts

## 4. Whitelist System and User Control

### Site Approval Process

- **User-Controlled**: You must manually approve each website where the extension operates
- **Explicit Consent**: Extension remains completely inactive on non-whitelisted sites
- **Easy Management**: Add or remove sites through the extension popup or options page
- **Granular Control**: Enable or disable the extension on any site at any time

### Default Behavior

- **Inactive by Default**: Extension does not process any content until you whitelist a site
- **No Automatic Activation**: Never automatically enables on new websites
- **Permission Requests**: Explicitly asks for permission before accessing any new domain

## 5. Data Storage and Retention

### Local Storage Only

All data is stored using Chrome's extension storage APIs:

- **Sync Storage**: User preferences (synced across your Chrome installations if you're signed in)
- **Local Storage**: Character data and novel information (device-specific)
- **No External Servers**: No data is ever transmitted to or stored on external servers

### Automatic Data Management

- **Intelligent Cleanup**: Character data for novels not accessed in 30+ days is automatically removed
- **Size Management**: Automatically manages storage size to prevent browser performance issues
- **User Control**: You can manually clear all data through the extension options page

### Data Portability

- **Local Access**: All your data remains accessible through Chrome's developer tools
- **No Lock-in**: Data format is standard JSON, easily exportable if needed
- **Transparency**: Options page shows exactly what data is stored

## 6. Security Measures

### Input Sanitization

- **DOMPurify**: All text content is sanitized using DOMPurify library to prevent security issues
- **Validation**: All user inputs are validated and sanitized before processing
- **Safe Defaults**: Extension uses safe default values for all settings

### Content Security Policy

- **Strict CSP**: Prevents execution of unauthorized scripts
- **No Inline Scripts**: All JavaScript is contained in separate files
- **Controlled Loading**: External resources limited to approved CDNs only

### Origin Validation

- **Whitelist Enforcement**: Extension only operates on explicitly approved domains
- **Permission Checks**: Validates permissions before any content access
- **Secure Communication**: All internal communication uses Chrome's secure messaging APIs

## 7. Third-Party Services and Dependencies

### Ollama (Local AI Service)

- **User-Installed**: You install and control Ollama on your own machine
- **Local Network Only**: Communication happens over localhost (127.0.0.1)
- **No Internet Required**: Ollama operates entirely offline once set up
- **User Responsibility**: You control which AI models are installed and used

### External Resources

- **CDN Libraries**: Uses approved CDNs for essential libraries (Font Awesome icons, DOMPurify)
- **No Analytics**: No Google Analytics, tracking pixels, or similar services
- **No External APIs**: No communication with external web services or APIs

## 8. Children's Privacy

This extension does not knowingly collect information from children under 13. The extension:

- **No Account Creation**: Requires no personal information or account setup
- **Local Operation**: Processes only text content you're already viewing
- **Parental Control**: Parents can control extension installation and website access

## 9. Data Subject Rights

### Your Rights

Even though we don't collect personal data, you have full control over the extension:

- **Access**: View all stored data through the extension options page
- **Deletion**: Clear all data through the options page or by uninstalling the extension
- **Portability**: Export data using Chrome's developer tools if needed
- **Control**: Enable/disable functionality on any website

### Data Deletion

To completely remove all extension data:

1. Open extension options page
2. Use "Reset Statistics" and "Clear All Sites" buttons
3. Uninstall the extension through Chrome's extension management page

## 10. Changes to This Policy

### Notification of Changes

- **Version Updates**: Policy updates will be reflected in extension updates
- **Transparency**: Significant changes will be noted in release notes
- **User Choice**: You can review changes before updating the extension

### Policy Evolution

We may update this Privacy Policy to reflect:

- Changes in functionality
- Legal requirement updates
- User feedback and clarification requests
- Security improvement measures

## 11. International Compliance

### GDPR Compliance (EU)

- **No Personal Data Processing**: Extension doesn't process personal data as defined by GDPR
- **Local Processing**: All processing happens locally on user's device
- **User Consent**: Explicit consent required for website access through whitelist system
- **Data Minimization**: Only stores data necessary for functionality

### CCPA Compliance (California)

- **No Sale of Data**: No user data is collected, stored, or sold
- **Transparency**: This policy provides complete transparency about data practices
- **User Control**: Users have complete control over all extension functionality

## 12. Contact Information

If you have questions or concerns about this Privacy Policy or the extension's data practices:

- **Email**: <thomasdemay37@gmail.com>
- **GitHub Issues**: Submit issues or questions through the project repository
- **Extension Feedback**: Use Chrome Web Store review system for feedback

## 13. Technical Details for Transparency

### Storage Specifications

- **Chrome Extension Storage**: Uses chrome.storage.sync and chrome.storage.local APIs
- **Data Format**: Standard JSON format for all stored data
- **Encryption**: Data encrypted by Chrome's built-in extension storage encryption
- **Scope**: Data isolated to extension, not accessible by websites

### Network Communication

- **Localhost Only**: Only communicates with local Ollama service (localhost:11434)
- **No External Requests**: Never makes HTTP requests to external servers
- **Offline Capable**: Functions completely offline once Ollama is configured

---

## Summary (TL;DR)

**Complete Privacy Protection:**

- ✅ **No data collection** - We don't collect any personal information
- ✅ **Local processing only** - All AI processing happens on your computer
- ✅ **No external servers** - No data ever leaves your device
- ✅ **User control** - You control which sites can use the extension
- ✅ **Transparent operation** - All functionality is clearly explained
- ✅ **Easy removal** - Uninstall anytime to remove all data

**Your data stays on your device. Period.**

---

*This Privacy Policy is written in plain language to ensure transparency. If you need clarification on any point, please don't hesitate to contact us.*
