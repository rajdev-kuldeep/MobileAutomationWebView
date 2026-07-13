import type {
  FailureClassification,
  FailureClassifiedEvent,
  StepEvent,
} from '../models/events.js';

/**
 * Heuristic failure classification + AI-ready hints.
 *
 * The Java framework may publish its own FAILURE_CLASSIFIED event (preferred —
 * it has the most context). When it does not, this service derives a
 * classification from the STEP_FAILED payload so the dashboard always shows
 * *something* actionable. Rules are intentionally simple, ordered, and easy
 * to extend; future AI agents can consume the same structured output.
 */
interface Heuristic {
  matches: (e: StepEvent) => boolean;
  classification: FailureClassification;
  possibleCause: string;
  recommendedFixLayer: string;
  doNotFixBy: string;
}

const HEURISTICS: Heuristic[] = [
  {
    matches: (e) => /SessionNotCreated|NoSuchSession|WebDriverException.*terminated/i.test(text(e)),
    classification: 'DEVICE_SESSION_ISSUE',
    possibleCause: 'The Appium/WDA session died or was never created (device offline, port clash, stale session).',
    recommendedFixLayer: 'DriverManager / capability setup; verify device and Appium server health.',
    doNotFixBy: 'Retrying the scenario blindly without recreating the driver session.',
  },
  {
    matches: (e) => /popup|dialog|alert|permission/i.test(text(e)),
    classification: 'APP_ISSUE',
    possibleCause: 'A popup, system dialog, or permission prompt is blocking the expected screen.',
    recommendedFixLayer: 'Page-level popup handlers (e.g. LoginPage.handlePostLoginPopUps or BankingHomePage.handle*).',
    doNotFixBy: 'Adding Thread.sleep in step definitions.',
  },
  {
    matches: (e) =>
      /NoSuchElement|ElementNotFound|StaleElementReference|TimeoutException/i.test(
        e.exceptionType ?? '',
      ),
    classification: 'AUTOMATION_ISSUE',
    possibleCause:
      'Element was not found in time — locator drift, slow screen transition, or an unhandled popup/SSO redirect.',
    recommendedFixLayer:
      'Page object locator + wait strategy for the failed page; check locator quality badge in the Locator Inspector.',
    doNotFixBy: 'Increasing implicit waits globally or adding Thread.sleep.',
  },
  {
    matches: (e) => /user.*not.*found|test ?data|no.*available.*user|UserManager/i.test(text(e)),
    classification: 'TEST_DATA_ISSUE',
    possibleCause: 'Required test user/data was missing, locked, or in the wrong state.',
    recommendedFixLayer: 'UserManager / test data provisioning for the environment.',
    doNotFixBy: 'Hardcoding a different user in the step definition.',
  },
  {
    matches: (e) => /50[0234]|gateway|ECONNREFUSED|UnknownHost|SSL|handshake/i.test(text(e)),
    classification: 'ENVIRONMENT_ISSUE',
    possibleCause: 'A backend/environment dependency was unreachable or returned a server error.',
    recommendedFixLayer: 'Environment health checks before the run; API client retry policy.',
    doNotFixBy: 'Marking the scenario flaky and re-running until green.',
  },
  {
    matches: (e) => /assert|expected.*but|comparison/i.test(text(e)),
    classification: 'APP_ISSUE',
    possibleCause: 'The app rendered a different state than the test expected — possible real defect.',
    recommendedFixLayer: 'Verify manually first; if the app is correct, update the page assertion.',
    doNotFixBy: 'Loosening the assertion until it always passes.',
  },
];

function text(e: StepEvent): string {
  return `${e.exceptionType ?? ''} ${e.message ?? ''}`;
}

export class FailureAnalysisService {
  /** Build a FAILURE_CLASSIFIED event from a raw STEP_FAILED, if the framework didn't send one. */
  classify(event: StepEvent): FailureClassifiedEvent {
    const rule = HEURISTICS.find((h) => h.matches(event));
    return {
      eventType: 'FAILURE_CLASSIFIED',
      runId: event.runId,
      scenarioId: event.scenarioId,
      stepId: event.stepId,
      timestamp: event.timestamp,
      failureClassification:
        event.failureClassification ?? rule?.classification ?? 'UNKNOWN_REQUIRES_INVESTIGATION',
      exceptionType: event.exceptionType,
      message: event.message,
      possibleCause:
        event.possibleCause ?? rule?.possibleCause ?? 'No matching heuristic; inspect logs around the failure.',
      recommendedFixLayer:
        event.recommendedFixLayer ?? rule?.recommendedFixLayer ?? 'Start from the failed page object and its waits.',
      doNotFixBy: event.doNotFixBy ?? rule?.doNotFixBy ?? 'Adding Thread.sleep in step definitions.',
      failedPage: event.page,
    };
  }
}
