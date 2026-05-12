# Dark Theme Email Rendering Strategy

## Core recommendation

Keep the app shell dark, but treat the email body as an independent document.

Do **not** force every received email into dark mode. Many HTML emails are designed with fixed backgrounds, logos, product images, inline styles, branded buttons, tables, and screenshots. If the interface aggressively inverts or restyles them, the message can become visually broken or unreadable.

The best mental model is:

> The dark interface is the desk. The email is the letter on top of it.

If the letter is white, let it stay white. The goal is to make the white email feel intentional inside the dark interface, not like a broken section of the page.

---

## Recommended default behavior

Use a **dark app shell** with a **controlled email canvas**.

The surrounding interface should remain dark:

- inbox sidebar
- message list
- message header
- sender metadata
- action bar
- attachment chips
- reply controls

The email body should render inside a separate centered message area.

For HTML email, preserve the sender's original design by default.

For plain-text email, render the message using the app's dark theme.

---

## Agreement with the proposed tactics

### 1. Use an iframe envelope — strongly agree

This is the most important tactic.

Render each HTML email inside an isolated message viewer, then wrap it in a slim dark envelope. The email should not bleed edge-to-edge into the dark application.

Recommended presentation:

- dark outer wrapper
- centered message body
- max width around **680–760px**
- default target around **720px**
- subtle border or shadow
- rounded clipping
- small amount of padding around the email body
- original email background preserved

A width around 720px is a good default because many marketing and transactional emails are designed around roughly 600–700px layouts. Stretching them too wide often makes them look broken.

One adjustment: do not always force a white canvas. Use the email's own background when provided. Some emails already support dark backgrounds or brand-specific colors.

---

### 2. Never force-invert HTML email — completely agree

Forced inversion should not be the default.

Auto-darkening HTML email can break:

- logos
- screenshots
- product images
- charts
- social icons
- email signatures
- branded buttons
- QR codes
- transparent PNGs
- visual hierarchy

The safer rule is:

> Plain text can be dark-themed. HTML email should be preserved by default.

For HTML email, dark rendering should be an optional reader mode, not the primary display mode.

---

### 3. Provide escape hatches — agree, with refinement

The proposed escape hatches are useful, but they should be framed as user-controlled view modes rather than automatic transformations.

Recommended view options:

- **Original**
- **Plain text**
- **Reader mode**

#### Original

This is the default for HTML email.

It preserves the sender's actual layout, colors, images, spacing, and branding.

#### Plain text

This uses the plain-text body when available from the email API.

It is useful for:

- accessibility
- broken HTML emails
- users who prefer simple reading
- privacy-conscious reading
- debugging rendering issues

However, do not assume that newsletters always look better as plain text. Many newsletters, receipts, invoices, alerts, and product updates are intentionally visual.

#### Reader mode

Reader mode is a cleaned-up, dark-themed version for simple messages.

It should not be treated as the same thing as plain text. Reader mode can preserve links, basic structure, quotes, and readable formatting while removing heavy styling.

---

## Image loading policy

Do not automatically invert images.

Images should render as the sender intended once loaded. Inverting images can damage logos, charts, screenshots, photos, product images, QR codes, and transparent assets.

Recommended image policy:

> Block remote images for unknown, external, or untrusted senders. Provide a clear one-click action to load them.

Suggested controls:

- **Load images for this email**
- **Always load images from this sender**
- **Always load images from this domain**

Distinguish between image types:

| Image type | Suggested handling |
|---|---|
| Remote tracking images | Block until user allows |
| Inline CID attachments | Usually safe to show |
| User-attached images | Usually safe to show |
| Known trusted sender images | Load based on allowlist |
| Unknown sender remote images | Block by default |

This gives the product a better privacy model than simply blocking images based on unread state.

---

## Render-mode policy

Define predictable rendering behavior instead of trying to magically dark-mode every email.

| Email condition | Default display |
|---|---|
| Plain text only | Dark-themed message body |
| Simple HTML with minimal styling | Original, with optional reader mode |
| HTML with explicit white background | White email card inside dark envelope |
| Marketing/newsletter email | Original inside dark envelope |
| Email with many images | Original, with privacy-controlled image loading |
| Broken or ugly HTML | Offer plain text or reader mode |
| Sender-provided dark-mode variant | Respect it, but do not force it |

---

## Handling white-background emails

White-background emails should remain white if that is how they were designed.

The interface should make them feel intentional by placing them inside a dark frame.

Recommended visual treatment:

- dark slate envelope around the email
- small padding between the app shell and the email canvas
- subtle border
- rounded corners
- centered layout
- max width cap
- optional soft seam treatment at the top edge

A faint gradient or shadow at the edge can help soften the transition from the dark interface to the white email body.

The key is to avoid letting a white email body touch the edges of the dark app, because that makes it feel like a rendering mistake.

---

## Handling emails with images

Images should not be force-darkened or inverted.

Recommended behavior:

- preserve original image colors
- scale images responsively
- block remote images from unknown senders
- allow user-controlled loading
- preserve inline images when safe
- avoid applying dark filters to photos, logos, charts, and screenshots

For transparent PNGs or logos that disappear against a dark background, the issue should usually be solved by preserving the original email canvas rather than manipulating the image itself.

If a reader mode is used, transparent images may need a neutral backing surface, but this should be a fallback, not the default behavior.

---

## Respect sender-provided dark mode

Some modern emails include their own dark-mode styles.

If the email author provided a dark variant, the viewer should allow it to work. But the app should not manufacture dark mode for complex HTML emails.

Product rule:

> Respect sender-provided dark mode, but do not force-darken complex HTML email.

This means the iframe or email viewer can respond to the user's color-scheme preference when the email itself supports it, but the app should not inject aggressive dark CSS into every HTML email.

Reference: [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-color-scheme)

---

## Security and isolation requirements

HTML email should be treated as untrusted content.

Render it in an isolated viewer rather than directly inside the app's main DOM.

Recommended requirements:

- isolate email HTML from app UI
- prevent email CSS from leaking into the app
- prevent app CSS from accidentally rewriting the email
- block scripts
- sanitize unsafe HTML
- control remote image loading
- handle links safely
- restrict forms and embedded content
- support fallback to plain text
- support inline CID images and attachments safely

Using a sandboxed iframe is a strong default because it keeps the email document separate from the application interface.

Reference: [MDN: iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)

---

## Final product recommendation

Use this as the final behavior:

> The app stays fully dark. Each HTML email opens inside a centered, sandboxed message card wrapped by a dark slate envelope. The email body is rendered in its original style by default, including white backgrounds. Plain-text emails use the app's dark theme. Remote images are blocked for unknown senders with a clear **Load images** action and sender/domain allowlist. Users can switch between **Original**, **Plain text**, and **Reader mode** when available. Do not force-invert HTML email; only respect dark-mode variants that the sender already provided.

---

## Summary

The strongest approach is:

> **Dark chrome, original email canvas, privacy-aware images, and user-controlled fallbacks.**

This gives the interface a consistent dark-theme feel without breaking real-world emails.
