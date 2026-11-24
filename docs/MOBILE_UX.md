# Mobile UX improvements (v0.3.0)

This release adds mobile-specific navigation and interaction patterns while retaining the desktop sidebar.

## Included
- Fixed bottom navigation for Home, Drive, Requests, and Accounts.
- Center quick-action control that opens a bottom sheet.
- Quick actions: connect account, find files, review requests, sync connected accounts, and open scheduled access.
- Sticky mobile header and one-tap search shortcut.
- Safe-area-aware spacing for devices with gesture navigation and display cutouts.
- Horizontally scrollable metric cards with snap behavior.
- Compact file cards on small screens instead of a cramped desktop table.
- Sticky bulk-selection action bar for selected files.
- Bottom-sheet sharing modal on mobile.
- Larger touch targets and reduced-motion support.
- Recently updated files panel derived from synchronized file metadata.

## Deliberate boundaries
- The mobile controls call the same API actions as desktop.
- Backend operations that are not implemented remain disabled or return a safe error.
- No private Drive content is cached for offline use.
- No public Drive links are created by these UI changes.
