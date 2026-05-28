# Resume Header Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the resume portrait to the far-right header slot while moving the existing header information left and preserving the rest of the one-page PDF.

**Architecture:** Use the approved PDF render as the visual source of truth. Inspect the PDF header objects with PyMuPDF, rewrite only the header region in a new output PDF beside the input file, and verify with rendered page comparisons plus text checks.

**Tech Stack:** PyMuPDF (`fitz`), local PDF render PNGs, shell verification commands

---

## File Structure

- Input PDF: `/Users/erem1ka/Downloads/【储备实习】动效设计实习生-张峻烨简历-19806808176.pdf`
- Output PDF: `/Users/erem1ka/Downloads/【储备实习】动效设计实习生-张峻烨简历-19806808176_头像右置.pdf`
- Temporary render files: `/Users/erem1ka/Desktop/bit/tmp/pdfs/`
- Reference spec: `/Users/erem1ka/Desktop/bit/docs/superpowers/specs/2026-05-22-resume-header-swap-design.md`

### Task 1: Inspect and Preserve the Working PDF State

**Files:**
- Read: `/Users/erem1ka/Downloads/【储备实习】动效设计实习生-张峻烨简历-19806808176.pdf`
- Read: `/Users/erem1ka/Desktop/bit/output/pdf/【储备实习】动效设计实习生-张峻烨简历-19806808176_实习时间已更新.pdf`
- Create: `/Users/erem1ka/Desktop/bit/tmp/pdfs/resume-header-source.png`

- [ ] **Step 1: Render the current edited resume page**

Run a PyMuPDF render of the date-updated PDF into `tmp/pdfs/resume-header-source.png`.

- [ ] **Step 2: Inspect header object bounds**

Run a PyMuPDF inspection for image rectangles and text spans above the `教育经历` heading. Record the portrait rectangle and the text span boxes needed to keep the information hierarchy unchanged.

### Task 2: Reposition Header Content

**Files:**
- Create: `/Users/erem1ka/Downloads/【储备实习】动效设计实习生-张峻烨简历-19806808176_头像右置.pdf`
- Create: `/Users/erem1ka/Desktop/bit/tmp/pdfs/resume-header-right-portrait.png`

- [ ] **Step 1: Rewrite only the header region**

Use PyMuPDF to preserve the date-updated PDF body, remove the existing header arrangement above `教育经历`, and place the original header portrait at the far-right while shifting the existing header information group left.

- [ ] **Step 2: Render the rewritten PDF**

Render the resulting one-page PDF to `tmp/pdfs/resume-header-right-portrait.png`.

- [ ] **Step 3: Visually review the header**

Open the rendered PNG and confirm the portrait is rightmost, the information structure matches the approved swap direction, and no content below the header moved.

### Task 3: Verify Output

**Files:**
- Verify: `/Users/erem1ka/Downloads/【储备实习】动效设计实习生-张峻烨简历-19806808176_头像右置.pdf`

- [ ] **Step 1: Verify page and text invariants**

Run PyMuPDF checks that the output still has one page, still contains `2026/01 - 至今`, and no longer contains `2026/01 - 2026/05`.

- [ ] **Step 2: Compare non-header rendering**

Compare the rendered source and output pages outside the header region to confirm visual differences are limited to the approved top header change.
