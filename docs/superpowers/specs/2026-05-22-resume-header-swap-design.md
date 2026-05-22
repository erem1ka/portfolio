# Resume Header Swap Design

## Goal

Update the top header of the motion design internship resume PDF so the portrait sits on the far right and the existing identity/contact information shifts left into the portrait's former area.

## Scope

- Edit only the resume header above the `教育经历` section.
- Keep the previously updated internship date text as `2026/01 - 至今`.
- Preserve all body sections, body typography, section rules, and page count.

## Layout

- Move the portrait from the far-left header position to the far-right header position.
- Keep the portrait size, crop, and visual treatment unchanged.
- Move the name and adjacent contact information left as one header information group.
- Preserve the current information hierarchy:
  - Name remains the strongest header text.
  - Phone and portfolio note stay together in the left-side contact cluster.
  - Email and availability stay together in the right-side contact cluster before the portrait.
- Keep the revised header visually close to the current layout: this is a position swap and spacing adjustment, not a redesign.

## Editing Approach

Use the existing rendered PDF as the source of truth for the header assets and typography. Reposition the original portrait and header information without changing text content, fonts, or downstream resume layout.

## Verification

- Render the updated PDF page and visually compare the header against the approved swap direction.
- Confirm the portrait is rightmost in the header and the information group is shifted left.
- Confirm `教育经历` and all later sections keep their original positions and content.
- Confirm the final PDF remains one page and the previously changed internship date remains present.
