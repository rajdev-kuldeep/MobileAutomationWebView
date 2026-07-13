#!/usr/bin/env node
/**
 * Cashi Automation Live View — run simulator.
 *
 * Posts a realistic Banking Login scenario to the live-view server so the
 * dashboard can be demoed, developed, and end-to-end tested without a device
 * or the Java framework. Mirrors exactly what LiveViewClient publishes.
 *
 * Usage:
 *   node scripts/simulate-run.mjs             # real-time pacing (~30s)
 *   node scripts/simulate-run.mjs --fast      # 20x speed for CI/smoke tests
 *   node scripts/simulate-run.mjs --fail      # force the final step to fail
 */
import zlib from 'node:zlib';

const SERVER = process.env.LIVEVIEW_URL ?? 'http://localhost:4545';
const FAST = process.argv.includes('--fast');
const FORCE_FAIL = process.argv.includes('--fail');
const SPEED = FAST ? 20 : 1;

const runId = new Date()
  .toISOString()
  .replace(/[-:T]/g, '')
  .slice(0, 8) + '-' + new Date().toISOString().slice(11, 19).replace(/:/g, '');
const scenarioId = 'banking-login-valid-user';

// ---------------------------------------------------------------------------
// Tiny PNG encoder (no dependencies): solid-ish phone screens per step so the
// device view visibly changes as the "test" progresses.
// ---------------------------------------------------------------------------
function crc32(buf) {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    crc ^= buf[n];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Render a fake app screen: colored background, "status bar", "buttons". */
function makeScreenPng(w, h, [r, g, b], step) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 4;
      let pr = r, pg = g, pb = b;
      if (y < 28) { pr = 20; pg = 24; pb = 32; }                       // status bar
      const btnTop = 300 + step * 40;
      if (y > btnTop && y < btnTop + 90 && x > 40 && x < w - 40) {     // "element"
        pr = Math.min(255, r + 70); pg = Math.min(255, g + 70); pb = Math.min(255, b + 70);
      }
      const grad = Math.floor((y / h) * 40);
      raw[i] = Math.max(0, pr - grad);
      raw[i + 1] = Math.max(0, pg - grad);
      raw[i + 2] = Math.max(0, pb - grad);
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((res) => setTimeout(res, ms / SPEED));
const now = () => new Date().toISOString();

async function post(events) {
  const body = JSON.stringify(Array.isArray(events) ? events : [events]);
  const res = await fetch(`${SERVER}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`POST /api/events -> ${res.status}`);
}

const base = (eventType, extra = {}) => ({ eventType, runId, timestamp: now(), ...extra });

function log(source, level, message, stepId) {
  return base('LOG', { scenarioId, stepId, source, level, message });
}

function screenshot(stepId, kind, color, stepIndex) {
  return base('SCREENSHOT_CAPTURED', {
    scenarioId,
    stepId,
    kind,
    imageBase64: makeScreenPng(360, 740, color, stepIndex).toString('base64'),
  });
}

// ---------------------------------------------------------------------------
const STEPS = [
  {
    id: 'step-001', keyword: 'Given', text: 'user has a valid banking customer',
    page: 'UserManager', method: 'acquireBankingUser', color: [30, 41, 59],
    locators: [],
    logs: [
      ['TESTDATA', 'INFO', 'Acquiring banking user for stage environment'],
      ['API', 'INFO', 'GET /users/available?type=banking -> 200 (312ms)'],
      ['TESTDATA', 'INFO', 'User cashi_qa_banking_017 locked for this run'],
    ],
  },
  {
    id: 'step-002', keyword: 'When', text: 'user launches Cashi app',
    page: 'LaunchPage', method: 'launchApp', color: [15, 79, 74],
    locators: [
      { strategy: 'resource-id', locator: 'cashi_splash_logo', action: 'waitForVisibility',
        waitStrategy: 'waitForVisibility', timeoutMs: 15000, pollingMs: 200, durationMs: 2140,
        result: 'FOUND', bounds: { x: 120, y: 290, width: 120, height: 120 } },
    ],
    logs: [
      ['APPIUM', 'INFO', 'Activating app com.cashi.banking.stage'],
      ['DEVICE', 'DEBUG', 'ActivityManager: START u0 {cmp=com.cashi.banking/.MainActivity}'],
      ['FRAMEWORK', 'INFO', 'Splash screen visible after 2.1s'],
    ],
  },
  {
    id: 'step-003', keyword: 'And', text: 'user logs in to Cashi Banking',
    page: 'LoginPage', method: 'loginToBanking', flow: 'LoginFlow', color: [49, 46, 129],
    locators: [
      { strategy: 'resource-id', locator: 'login_username_input_field', action: 'sendKeys',
        waitStrategy: 'waitForVisibility', timeoutMs: 10000, pollingMs: 200, durationMs: 412,
        result: 'FOUND', elementText: 'cashi_qa_banking_017',
        bounds: { x: 124, y: 540, width: 840, height: 92 } },
      { strategy: 'resource-id', locator: 'login_password_input_field', action: 'sendKeys',
        waitStrategy: 'waitForVisibility', timeoutMs: 10000, pollingMs: 200, durationMs: 842,
        result: 'FOUND', elementText: '****',
        bounds: { x: 124, y: 682, width: 840, height: 92 } },
      { strategy: 'xpath', locator: '//android.widget.Button[@text="Iniciar sesión"]',
        action: 'click', waitStrategy: 'waitForClickable', timeoutMs: 10000, pollingMs: 200,
        durationMs: 305, result: 'FOUND', bounds: { x: 124, y: 830, width: 840, height: 110 } },
    ],
    logs: [
      ['FRAMEWORK', 'INFO', 'Username field visible, entering username'],
      ['FRAMEWORK', 'INFO', 'Password field visible, entering password'],
      ['LOCATOR', 'WARN', 'XPath locator used for login button — consider adding resource-id'],
      ['SSO', 'INFO', 'SSO redirect detected, waiting for token exchange'],
      ['API', 'INFO', 'POST /auth/token -> 200 (891ms)'],
    ],
  },
  {
    id: 'step-004', keyword: 'Then', text: 'Banking Home should be displayed',
    page: 'BankingHomePage', method: 'verifyBankingHomeDisplayed', flow: 'LoginFlow',
    color: FORCE_FAIL ? [127, 29, 29] : [6, 78, 59],
    fail: FORCE_FAIL,
    locators: [
      FORCE_FAIL
        ? { strategy: 'uiselector', locator: 'new UiSelector().textContains("Saldo Cuenta Cashi")',
            action: 'waitForVisibility', waitStrategy: 'waitForVisibility', timeoutMs: 10000,
            pollingMs: 200, durationMs: 10004, result: 'TIMEOUT', retryCount: 2,
            exceptionType: 'NoSuchElementException', message: 'Saldo Cuenta Cashi not found' }
        : { strategy: 'uiselector', locator: 'new UiSelector().textContains("Saldo Cuenta Cashi")',
            action: 'waitForVisibility', waitStrategy: 'waitForVisibility', timeoutMs: 10000,
            pollingMs: 200, durationMs: 1204, result: 'FOUND',
            bounds: { x: 60, y: 380, width: 960, height: 140 } },
    ],
    logs: FORCE_FAIL
      ? [
          ['POPUP', 'WARN', 'Unexpected popup detected: "Promoción Cashi Plus"'],
          ['FRAMEWORK', 'ERROR', 'Banking Home validation failed after 10s'],
        ]
      : [
          ['FRAMEWORK', 'INFO', 'Banking Home rendered, balance widget visible'],
          ['CUCUMBER', 'INFO', 'Scenario assertions completed'],
        ],
  },
];

async function main() {
  console.log(`simulating run ${runId} against ${SERVER} (speed x${SPEED})`);

  await post(base('RUN_STARTED', {
    project: 'CashiUIAutomation',
    module: 'CashiMobileAutomation',
    environment: 'stage',
    executionMode: 'local',
    platform: 'Android',
  }));

  await post(base('DEVICE_INFO', {
    platform: 'Android',
    deviceName: 'Pixel 6 Pro Emulator',
    udid: 'emulator-5554',
    osVersion: '14',
    environment: 'stage',
    executionMode: 'local',
    appiumPort: 4723,
    systemPort: 8201,
    chromeDriverPort: 9515,
    appiumSessionId: 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
    implicitWaitSec: 1,
    appPackage: 'com.cashi.banking.stage',
    appActivity: 'com.cashi.banking.MainActivity',
  }));

  await post(base('SCENARIO_STARTED', {
    scenarioId,
    featureName: 'BankingLogin.feature',
    scenarioName: 'User logs in to Cashi Banking',
    tags: ['@RegressionTest', '@BankingLogin'],
  }));

  await post(log('CUCUMBER', 'INFO', 'Scenario started: User logs in to Cashi Banking'));

  let failed = false;
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];

    if (failed) {
      await post(base('STEP_SKIPPED', {
        scenarioId, stepId: step.id, keyword: step.keyword, stepText: step.text, status: 'SKIPPED',
      }));
      continue;
    }

    await post(base('STEP_STARTED', {
      scenarioId, stepId: step.id, keyword: step.keyword, stepText: step.text,
      status: 'RUNNING', page: step.page, method: step.method, flow: step.flow,
    }));
    await post(screenshot(step.id, 'BEFORE_STEP', step.color.map((c) => Math.max(0, c - 25)), i));
    await sleep(600);

    for (const locator of step.locators) {
      await post(base('LOCATOR_USED', {
        scenarioId, stepId: step.id, page: step.page, method: step.method,
        platform: 'Android', ...locator,
      }));
      await sleep(500);
    }
    for (const [source, level, message] of step.logs) {
      await post(log(source, level, message, step.id));
      await sleep(250);
    }

    await post(screenshot(step.id, step.fail ? 'FAILURE' : 'AFTER_STEP', step.color, i));

    if (step.fail) {
      failed = true;
      await post(base('STEP_FAILED', {
        scenarioId, stepId: step.id, stepText: step.text, status: 'FAILED',
        page: step.page, method: step.method, durationMs: 10650,
        exceptionType: 'NoSuchElementException',
        message: 'Saldo Cuenta Cashi not found',
        stackTrace:
          'org.openqa.selenium.NoSuchElementException: Saldo Cuenta Cashi not found\n' +
          '\tat com.cashi.pages.BankingHomePage.verifyBankingHomeDisplayed(BankingHomePage.java:87)\n' +
          '\tat com.cashi.flows.LoginFlow.loginToBanking(LoginFlow.java:42)',
      }));
      await post(base('FAILURE_CLASSIFIED', {
        scenarioId, stepId: step.id,
        failureClassification: 'AUTOMATION_ISSUE',
        exceptionType: 'NoSuchElementException',
        message: 'Saldo Cuenta Cashi not found',
        possibleCause: 'A popup ("Promoción Cashi Plus") is blocking the expected Banking Home screen.',
        recommendedFixLayer: 'LoginPage.handlePostLoginPopUps() or BankingHomePage.handlePromotionalPopups()',
        doNotFixBy: 'Adding Thread.sleep in step definition.',
        failedPage: 'BankingHomePage',
        failedLocator: 'new UiSelector().textContains("Saldo Cuenta Cashi")',
        appActivity: 'com.cashi.banking.PromoDialogActivity',
      }));
    } else {
      await post(base('STEP_PASSED', {
        scenarioId, stepId: step.id, status: 'PASSED',
        durationMs: 900 + step.locators.length * 700 + step.logs.length * 260,
      }));
    }
    await sleep(400);
  }

  await post(base('SCENARIO_FINISHED', {
    scenarioId, status: failed ? 'FAILED' : 'PASSED', durationMs: 31000,
  }));
  await post(base('RUN_FINISHED', { status: failed ? 'FAILED' : 'PASSED' }));

  console.log(`simulated run ${runId} complete (${failed ? 'FAILED' : 'PASSED'})`);
}

main().catch((err) => {
  console.error('simulator failed:', err.message);
  process.exit(1);
});
