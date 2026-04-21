# QR Validator Testing Guide for Registration & Reception Team

**Document for:** "Registration and Reception Team" (5-6 members)  
**Purpose:** Validate concurrent QR scanning on mobile phones  
**Expected Duration:** 20-30 minutes for complete testing

---

## Pre-Event Testing (Do this 1 hour before event starts)

### Step 1: Device Preparation (5 minutes)

**For each of 6 mobile phones:**

1. **Charge to 100%** (critical for 4-6 hour event)
2. **Connect to event WiFi** (same network as backend)
3. **Turn OFF mobile data** (use WiFi only)
4. **Close background apps** (to free RAM)
5. **Test WiFi speed:**
   ```
   Open browser → google.com → should load in <2 seconds
   ```

| Device | OS | WiFi Connected | Notes |
|--------|----|----|-------|
| Phone 1 | iOS / Android | ✓ | |
| Phone 2 | iOS / Android | ✓ | |
| Phone 3 | iOS / Android | ✓ | |
| Phone 4 | iOS / Android | ✓ | |
| Phone 5 | iOS / Android | ✓ | |
| Phone 6 | iOS / Android | ✓ | |

---

### Step 2: Access QR Validator (5 minutes)

**For each phone:**

1. Open browser (Chrome/Safari recommended)
2. Navigate to: `http://<backend-ip>:5173` (ask IT for IP)
   - Or: `https://event.izee-culturals.edu` (if deployed)
3. Should see gate validator login page
4. **Sign In with volunteer credentials:**
   - Roll Number: `[your-roll-no]`
   - Email: `[your-email]`
   - Tap "Unlock Validator"

**Expected:** All 6 phones show "Entry Gate Validation" screen

| Device | Logged In | Status |
|--------|-----------|--------|
| Phone 1 | ✓ | Ready |
| Phone 2 | ✓ | Ready |
| Phone 3 | ✓ | Ready |
| Phone 4 | ✓ | Ready |
| Phone 5 | ✓ | Ready |
| Phone 6 | ✓ | Ready |

---

### Step 3: Camera Permission Test (5 minutes)

**For each phone:**

1. Tap "Scan Mode" button
2. Tap "Start Camera" button
3. **Expected:** Browser requests camera permission
   - iOS: "Allow [App] to access your camera?" → Tap "Allow"
   - Android: "Camera" → Toggle ON
4. **Verify back camera is active:**
   - Point at person's face → see their face (not mirror)
   - Point at background → see what's behind (not upside-down)
   - If you see upside-down or mirror image → camera is front-facing (problem!)

| Device | Camera | Facing | Status |
|--------|--------|--------|--------|
| Phone 1 | Working | Back ✓ | Ready |
| Phone 2 | Working | Back ✓ | Ready |
| Phone 3 | Working | Back ✓ | Ready |
| Phone 4 | Working | Back ✓ | Ready |
| Phone 5 | Working | Back ✓ | Ready |
| Phone 6 | Working | Back ✓ | Ready |

**If front camera appears:**
1. Stop camera
2. Look for "Camera Source" dropdown
3. Select a camera with "back" in the name
4. Try again

---

### Step 4: Single-Device Serial Test (5 minutes)

**Purpose:** Verify one phone can scan 5 times correctly

**Using Phone 1 only:**

1. Get a test participant's QR code (ask coordinator)
2. Position phone 6 inches from QR code
3. Scan once → Should see "Entry Valid" + name
4. Wait 2 seconds
5. Scan again → Should see "Entry Valid" + warning "Already Scanned"
6. Repeat 3 more times (total 5 scans)
7. Check scan counter in display: should show ~5 scans

**Expected Results:**
```
Scan 1: "Entry Valid" ✓
Scan 2: "Entry Valid. Already Scanned [time]" ✓
Scan 3: "Entry Valid. Already Scanned [time]" ✓
Scan 4: "Entry Valid. Already Scanned [time]" ✓
Scan 5: "Entry Valid. Already Scanned [time]" ✓
```

| Scan # | Result | Notes |
|--------|--------|-------|
| 1 | Valid ✓ | First scan |
| 2 | Already Scanned ✓ | Detected duplicate |
| 3 | Already Scanned ✓ | Detected duplicate |
| 4 | Already Scanned ✓ | Detected duplicate |
| 5 | Already Scanned ✓ | Detected duplicate |

---

### Step 5: Multi-Device Concurrent Test (10 minutes)

**Purpose:** Verify 6 phones can scan same QR simultaneously

**Setup:**
- Get same test QR code (same person)
- Have all 6 phones ready with cameras ON
- Coordinator holds QR code steady

**Test Procedure:**

1. **Coordinator says:** "Ready... Set... SCAN!"
2. **All 6 team members:** Point phone at QR, scan simultaneously
3. **Within 2 seconds:** All should see "Entry Valid"
4. **Check results:** Every phone should show:
   - Name: [Test Person Name]
   - Status: "Entry Valid"
   - Already Scanned warning: Some may show this (fine)

**Expected Behavior:**
```
Time    Device 1           Device 2           Device 3-6 (similar)
0ms     Scanning...        Scanning...        Scanning...
100ms   Request sent       Request sent       Request sent
200ms   Response: Valid    Response: Valid    Response: Valid
Result: ALL SHOW "ENTRY VALID" ✓
```

**Acceptance Criteria:**
- ✅ All 6 phones get "Entry Valid"
- ✅ All complete within 3 seconds
- ✅ No error messages
- ✅ No "Permission Denied" warnings

| Device | Result | Time (ms) | Notes |
|--------|--------|-----------|-------|
| Phone 1 | Valid ✓ | 150 | |
| Phone 2 | Valid ✓ | 160 | |
| Phone 3 | Valid ✓ | 155 | |
| Phone 4 | Valid ✓ | 170 | |
| Phone 5 | Valid ✓ | 145 | |
| Phone 6 | Valid ✓ | 180 | |

---

## Fallback Testing (If problems occur)

### If Camera Doesn't Start

**On affected phone:**
1. Tap "Stop Camera"
2. Tap "Manual Mode" button
3. Enter test person's registration ID (full UUID or short 8-char ID)
4. Tap "Validate Entry"
5. Should see "Entry Valid"

**Status:** ✓ Fallback works, use manual mode if camera fails

### If WiFi Connection Drops

1. Phone should show "Connection error"
2. Check WiFi connection
3. Reconnect to event WiFi
4. Tap "Start Camera" again
5. Should resume working

**Status:** ✓ Continue with next device

### If One Phone Shows "Already Scanned" (All 6 Scans)

This is actually correct! It means Supabase already registered those 6 scans. This is fine.

**Status:** ✓ System working as expected

---

## Event Day Workflow (During Registration)

### Scanning Station Setup

```
╔═══════════════════════════════════════════╗
║         Entry Checkpoint Layout           ║
╠═══════════════════════════════════════════╣
║ Station 1 (Phone 1)  → Attendee flows →   ║
║ Station 2 (Phone 2)  → through here       ║
║ Station 3 (Phone 3)                       ║
║ Station 4 (Phone 4)                       ║
║ Station 5 (Phone 5)                       ║
║ Station 6 (Phone 6)                       ║
╚═══════════════════════════════════════════╝
```

### Procedure for Each Attendee

1. **Attendee arrives** with confirmation email/screenshot
2. **Greeter:** "Welcome! Can I see your QR code?"
3. **Scan at any available station** (any of 6 phones)
4. **Result display:**
   - ✅ Green "ENTRY ALLOWED" → Welcome, move to event
   - ❌ Red "ENTRY DENIED" → Check with supervisor (might be pending approval)
5. **Next attendee** approaches next free station

### Scan Distribution Example

```
Time: 2:30 PM
Attendee A → Scanned by Phone 1 → Valid ✓
Attendee B → Scanned by Phone 2 → Valid ✓
Attendee C → Scanned by Phone 3 → Valid ✓
... (all 6 stations can work in parallel)
```

---

## Troubleshooting Checklist

### Problem: "Camera API not available"

**Cause:** Browser doesn't support camera access

**Solution:**
1. Try Chrome or Safari (most compatible)
2. Make sure you're on HTTPS or localhost
3. Use manual mode instead

### Problem: Permission Denied (Red banner)

**Cause:** You clicked "Don't Allow" on camera permission

**Solution:**
1. **iOS:** Settings → [App Name] → Camera → Turn ON
2. **Android:** Settings → Apps → [App Name] → Permissions → Camera → Allow

### Problem: Front Camera Appears (Mirror Image)

**Cause:** Browser selected front camera instead of back

**Solution:**
1. Look for "Camera Source" dropdown in Scan Mode
2. Select one with "Back" or "Environment" in name
3. Tap "Start Camera" again

### Problem: Scan Not Detected (Blank Response)

**Cause:** QR code not readable, or network timeout

**Solution:**
1. Position phone 4-8 inches from QR
2. Ensure good lighting
3. Try again
4. If still fails, use Manual Mode with ID

### Problem: Response Takes >3 Seconds

**Cause:** Network congestion or backend lag

**Solution:**
1. Check WiFi signal strength (look for WiFi icon)
2. Move closer to WiFi router if weak
3. Try again

### Problem: Person Shows "Pending Approval"

**Cause:** Faculty hasn't approved their registration yet

**Solution:**
1. Ask person to check email for approval status
2. If not approved, direct them to faculty team
3. They can proceed once approved

---

## Data Collection (For Coordinator)

**During event, track:**

| Time | Station | Attendee | Status | Notes |
|------|---------|----------|--------|-------|
| 2:30 PM | 1 | John D. | Valid ✓ | |
| 2:31 PM | 2 | Jane S. | Valid ✓ | |
| 2:31 PM | 3 | Ahmed M. | Valid ✓ | Already scanned from Station 1? |
| ... | ... | ... | ... | ... |

**Key metrics to track:**
- Total scans
- Duplicate scans (same person, multiple stations) → Should show "Already Scanned"
- Failed scans (Denied, Pending, Errors)
- Average time per scan
- Which station(s) had most issues

---

## Emergency Procedures

### If All 6 Phones Stop Working

1. **Check backend status:**
   - Ask IT: "Is the backend server running?"
   - If NO: Restart backend service
   - If YES: Check WiFi/network

2. **Switch to manual mode:**
   - Have attendees provide registration ID
   - Type manually into any working phone
   - Slower but functional

3. **If manual mode also fails:**
   - **Fallback:** Check pre-event coordinator list
   - Look up attendee name, verify attendance manually
   - Mark in spreadsheet, report to faculty later

### If One Phone Fails

**Solution:** 5 remaining phones continue. Distribute attendees across 5 stations.

```
Before: 6 stations, 6 phones
After: 5 stations, 5 phones (skip 1 broken)
Throughput: ~83% (acceptable)
```

---

## Post-Event Checklist

- [ ] All 6 phones returned to charging station
- [ ] Photos/screenshots of scan results collected
- [ ] Report any issues to coordinator
- [ ] Backup file from faculty dashboard with scan statistics
- [ ] Thank you sent to team members

---

## Success Criteria

✅ **Event is successful if:**
1. All 6 phones scan without major errors
2. "Already Scanned" warnings appear correctly
3. Valid attendees get "Entry Valid" status
4. Average scan time < 2 seconds
5. <5% failed scans (due to network/permissions)
6. No duplicate attendees pass through

✅ **Testing is complete when:**
1. All 6 phones can scan simultaneously (concurrent test passed)
2. Single phone can scan 5 times correctly (serial test passed)
3. Back camera verified on all phones
4. Manual mode works as fallback
5. All team members trained on procedures

---

## Team Roles (Assign Before Event)

| Role | Assignment | Responsibilities |
|------|-----------|------------------|
| **Station Lead** | 6 people (1 per phone) | Operate phone, guide attendee, note issues |
| **Roving Support** | 1 person | Help with manual mode, troubleshoot |
| **Supervisor** | 1 person | Verify "Entry Denied" cases, escalations |
| **Data Logger** | 1 person | Track scan times, errors, log issues |

---

## Quick Reference: Keyboard Shortcuts

| Scenario | Action |
|----------|--------|
| Switch Scan ↔ Manual | Tap "Scan Mode" or "Manual Mode" button |
| Change Camera | Select from "Camera Source" dropdown (if multiple) |
| Stop Camera | Tap "Stop Camera" button |
| Start Camera | Tap "Start Camera" button |
| Enter ID manually | Tap "Manual Mode" → type ID → tap "Validate" |
| Logout | Tap "Logout" button (top right) |
| Full page reload | Browser refresh (Ctrl+R or Cmd+R) |

---

## Contact During Event

- **Backend Issues:** IT Team / Tech Lead
- **Registration Issues:** Faculty Advisor
- **Attendee Questions:** Event Coordinator
- **Equipment Issues:** Team Supervisor

---

## Notes & Feedback

**Use this space to record observations during testing:**

```
Test Date: _______________
Tester Names: _______________
Test Results:
  - Back camera availability: _________________
  - Concurrent scan success: _________________
  - Issues encountered: _________________
  - Recommended fixes: _________________
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-21  
**Maintained by:** Event Tech Team
