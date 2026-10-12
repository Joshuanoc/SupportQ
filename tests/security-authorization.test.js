// Include security guardrails in the existing `npm test` glob.
// This imports the independent Node test cases from the security review.
import '../security/tests/solution_authorization_static.test.mjs';
