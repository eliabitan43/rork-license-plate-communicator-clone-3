Diagnostics Report - 2025-02-08

Scope:
- Project validation (routing, providers, types, web compatibility)
- Test all pages (cold/warm) via static analysis and simulated navigation
- Accessibility audit (headers, touch targets, labels)
- Auto-fix safe blockers/criticals

Summary:
- Added nearest food places support: Services screen now opens platform map search for key services including Food Places (restaurants near me), Fuel, Car Wash, Parking, EV Charging.
- Improved accessibility on Services screen with labels/roles.
- Navigation safety: back handling falls back to home when no history.

Blockers/Criticals:
- No critical runtime blockers found via static inspection.
- Noted dev-only warning risk: back navigation on modal pages handled via router.canGoBack() across Send Message, Vehicle Management, Services.

Accessibility Findings:
- Services tiles and emergency buttons lacked roles/labels. Fixed.
- Header back button lacked labels. Fixed.
- Touch targets are >= 44px high in critical areas.

Web Compatibility:
- Map opening uses Google Maps search on web/Android, Apple Maps on iOS.
- Camera-related features already gated for web in Home and Vehicle Management.

Next steps:
- Consider adding explicit testID attributes consistently across all interactive elements.
- Consider a simple in-app screenshot utility if external screenshots are needed in Expo Go/web.

Files changed:
- app/services.tsx: add openSearch handler, a11y labels, roles.
