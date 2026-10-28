import { authLoginSchema, authChallengeInputSchema, authResponseSchema, authRegistrationSchema, authRegistrationResponseSchema } from "@/contracts/auth";
import { practiceAttemptSchema, practiceCommandSchema, practiceResponseSchema } from "@/contracts/practice";
import { z } from "zod";
import { personalPrepResponseSchema } from "@/contracts/personal-prep";
import { studyProgressSchema, learningSelectionSchema } from "@/contracts/study";
import { sceneWeatherSchema } from "@/contracts/scene-weather";
import { codeReviewInput } from "@/lib/code-review";
import { matchInput } from "@/lib/question-match";
import {
  algorithmLanguageSchema, algorithmQuestionSchema, algorithmsResponseSchema, coachInputSchema, coachingHistoryResponseSchema,
  coachingResponseSchema, knowledgeDetailResponseSchema, knowledgeEntrySchema, knowledgeListResponseSchema,
  knowledgeQuerySchema, questionDetailQuerySchema, questionDetailSchema,
} from "@/contracts/learning";
import {
  workspaceActivitySchema, workspaceApplicationSchema, workspaceErrorSchema, workspaceMutationSchema,
  workspaceReviewSchema, workspaceSavedDocumentSchema, workspaceSessionSchema, workspaceStateSchema,
} from "@/contracts/workspace";
import {
  targetAssessmentSchema, targetCompanySchema, targetDebriefSchema, targetErrorSchema, targetInterviewSchema,
  targetMutationSchema, targetProgressSchema, targetRequirementSchema, targetResourceSchema, targetRoleSchema,
  targetRoleStateSchema, targetSourceSchema, targetStateSchema, targetStepSchema,
} from "@/contracts/targets";
import { careerCandidacySchema, careerStateSchema, commandResultSchema, errorSchema as careerErrorSchema, recordRevisionSchema } from "@/contracts/career";
import { researchCommandSchema, researchProfileSchema, researchRunSchema, researchSourceSchema, researchStateSchema, roleSuggestionSchema } from "@/contracts/company-research";

const languageSchema = algorithmLanguageSchema;
const errorSchema = z.object({ error: z.string(), code: z.string().optional(), currentRevision: z.number().int().optional(), details: z.unknown().optional() });
const healthSchema = z.object({ status: z.enum(["ok", "unavailable"]), database: z.literal("postgresql").optional() });
const questionMatchResponseSchema = z.object({
  version: z.literal(1), requestId: z.string(), status: z.enum(["matched", "ambiguous", "no_match", "insufficient_context"]),
  inferredAsk: z.string().nullable(),
  matches: z.array(z.object({ questionId: z.string(), title: z.string(), url: z.string(), difficulty: z.enum(["Easy", "Medium", "Hard"]), pattern: z.string(), summary: z.string(), relation: z.enum(["same_problem", "variant", "related_pattern"]), confidence: z.enum(["high", "medium", "low"]), reasons: z.array(z.string()), missingDetails: z.array(z.string()), questionUrl: z.string(), solution: z.object({ language: languageSchema, code: z.string(), explanation: z.array(z.string()) }).optional() })),
  clarifyingQuestion: z.string().nullable(), provider: z.object({ used: z.enum(["openai", "local"]), model: z.string().nullable(), degraded: z.boolean(), reason: z.string().nullable() }), bankSize: z.number().int(), warnings: z.array(z.string()),
});
const codeReviewResponseSchema = z.object({
  version: z.literal(1), requestId: z.string(), verdict: z.enum(["issues_found", "no_obvious_issue", "needs_context"]), summary: z.string(),
  issues: z.array(z.object({ severity: z.enum(["error", "warning", "suggestion"]), line: z.number().int().nullable(), endLine: z.number().int().nullable(), message: z.string(), fix: z.string() })),
  revisedCode: z.string().nullable(), changes: z.array(z.string()), suggestedTests: z.array(z.object({ input: z.string(), expected: z.string(), purpose: z.string() })), clarifyingQuestions: z.array(z.string()),
  execution: z.object({ status: z.literal("not_run"), reason: z.string() }), provider: z.object({ used: z.literal("openai"), model: z.string() }),
  routing: z.object({ style: z.enum(["systems", "steps", "visual"]), focus: z.string(), provider: z.enum(["jev", "profile"]), reason: z.string() }),
});
const exportResponseSchema = z.object({
  exportedAt: z.string(), version: z.number().int(), workspace: workspaceStateSchema, targets: targetStateSchema,
  career: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  practice: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  research: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  algorithms: z.array(z.object({ id: z.string(), data: algorithmQuestionSchema, createdAt: z.string() })),
  knowledge: z.array(z.object({ id: z.string(), data: knowledgeEntrySchema, createdAt: z.string() })),
  coaching: z.array(z.object({ id: z.string(), questionId: z.string(), language: z.string(), mode: z.string(), message: z.string(), model: z.string(), answer: z.unknown(), context: z.unknown(), createdAt: z.string() })),
});

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const converted = z.toJSONSchema(schema, { target: "draft-2020-12", io: "input", unrepresentable: "throw" }) as Record<string, unknown>;
  const { $schema: _schema, ...openApiSchema } = converted;
  return openApiSchema;
}

export const apiSchemas: Record<string, z.ZodType> = {
  LearningSelection: learningSelectionSchema.describe("A saved course or path, stored with action setting and key study:learning:<kind>:<id>. Removing it preserves progress and drafts. Course resume details must name a module in that course."),
  StudyProgress: studyProgressSchema.describe("Versioned lesson review saved as a JSON string with action setting and key study:lesson:<lessonId>. Server validation also checks course membership, exact check IDs and correct or explicitly revealed answers."),
  ApiError: errorSchema,
  HealthResponse: healthSchema,
  SceneWeather: sceneWeatherSchema,
  WorkspaceResponse: workspaceStateSchema,
  WorkspaceApplication: workspaceApplicationSchema,
  WorkspaceReview: workspaceReviewSchema,
  WorkspaceSession: workspaceSessionSchema,
  WorkspaceActivity: workspaceActivitySchema,
  WorkspaceSavedDocument: workspaceSavedDocumentSchema,
  WorkspaceMutation: workspaceMutationSchema,
  WorkspaceError: workspaceErrorSchema,
  AuthLogin: authLoginSchema,
  AuthChallenge: authChallengeInputSchema,
  AuthResponse: authResponseSchema,
  AuthRegistration: authRegistrationSchema,
  AuthRegistrationResponse: authRegistrationResponseSchema,
  PracticeAttempt: practiceAttemptSchema,
  PracticeCommand: practiceCommandSchema,
  PracticeResponse: practiceResponseSchema,
  TargetsResponse: targetStateSchema,
  TargetMutation: targetMutationSchema,
  TargetError: targetErrorSchema,
  CommandResult: commandResultSchema,
  CareerResponse: careerStateSchema,
  CareerCandidacy: careerCandidacySchema,
  RecordRevision: recordRevisionSchema,
  CareerError: careerErrorSchema,
  CompanyResearchProfile: researchProfileSchema,
  CompanyResearchRun: researchRunSchema,
  CompanyResearchSource: researchSourceSchema,
  CompanyRoleSuggestion: roleSuggestionSchema,
  CompanyResearchResponse: researchStateSchema,
  CompanyResearchCommand: researchCommandSchema,
  ExportResponse: exportResponseSchema,
  PersonalPrepResponse: personalPrepResponseSchema,
  AlgorithmQuestion: algorithmQuestionSchema,
  AlgorithmsResponse: algorithmsResponseSchema,
  QuestionDetailResponse: questionDetailSchema,
  QuestionMatchRequest: matchInput,
  QuestionMatchResponse: questionMatchResponseSchema,
  CodeReviewRequest: codeReviewInput,
  CodeReviewResponse: codeReviewResponseSchema,
  CoachingRequest: coachInputSchema,
  CoachingResponse: coachingResponseSchema,
  CoachingHistoryResponse: coachingHistoryResponseSchema,
  KnowledgeEntry: knowledgeEntrySchema,
  KnowledgeListResponse: knowledgeListResponseSchema,
  KnowledgeDetailResponse: knowledgeDetailResponseSchema,
  KnowledgeQuery: knowledgeQuerySchema,
  QuestionDetailQuery: questionDetailQuerySchema,
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonResponse = (description: string, schema: string) => ({ description, content: { "application/json": { schema: ref(schema) } } });
const errorResponse = (description: string) => jsonResponse(description, "ApiError");
const queryParameters = (schema: z.ZodObject) => Object.entries(schema.shape).map(([name, field]) => {
  const optional = field.isOptional();
  const json = jsonSchema(field as z.ZodType);
  return { name, in: "query", required: !optional, schema: json };
});

const paths = {
  "/api/scene-weather": { get: { operationId: "getSceneWeather", summary: "Read cached San Francisco weather for login artwork", description: "Public fixed-location weather model data and sunrise/sunset times. No account or user location data. Returns time-only when the provider is unavailable or stale. Cached for 15 minutes; login never depends on this request.", responses: { "200": jsonResponse("Weather model data or an explicit time-only fallback.", "SceneWeather") } } },
  "/api/auth/register": {post:{operationId:"registerAccount",summary:"Register, verify email, resend a code, or recover an account",description:"Email verification is required before private workspace access. Registration and recovery responses do not disclose whether an email already has an account.",requestBody:{required:true,content:{"application/json":{schema:ref("AuthRegistration")}}},responses:{"200":jsonResponse("Account request accepted.","AuthRegistrationResponse"),"400":errorResponse("Invalid fields or verification code."),"403":errorResponse("Origin rejected or registration disabled."),"429":errorResponse("Try again later."),"502":errorResponse("Account provider unavailable."),"503":errorResponse("Account setup incomplete.")}}},
  "/api/auth/login": {post:{operationId:"signIn",summary:"Sign in with the configured Cognito client",requestBody:{required:true,content:{"application/json":{schema:ref("AuthLogin")}}},responses:{"200":jsonResponse("Signed in with a host-only HttpOnly session cookie.","AuthResponse"),"202":jsonResponse("Additional verification required.","AuthResponse"),"400":errorResponse("Invalid sign-in fields or unsupported challenge."),"401":errorResponse("Credentials not accepted."),"403":errorResponse("Origin or account not allowed."),"429":errorResponse("Try again later."),"502":errorResponse("Provider unavailable."),"503":errorResponse("Sign-in setup incomplete.")}}},
  "/api/auth/challenge": {post:{operationId:"completeSignIn",summary:"Complete an encrypted Cognito sign-in challenge",requestBody:{required:true,content:{"application/json":{schema:ref("AuthChallenge")}}},responses:{"200":jsonResponse("Signed in.","AuthResponse"),"202":jsonResponse("Further verification needed.","AuthResponse"),"400":errorResponse("Invalid or expired challenge."),"401":errorResponse("Verification rejected."),"403":errorResponse("Origin or account not allowed."),"429":errorResponse("Try again later."),"502":errorResponse("Provider unavailable."),"503":errorResponse("Sign-in setup incomplete.")}}},
  "/api/auth/session": {get:{operationId:"readSignIn",summary:"Check the current authenticated session",responses:{"200":jsonResponse("Session status.","AuthResponse")}}},
  "/api/auth/logout": {post:{operationId:"signOut",summary:"Clear this browser's Deems session",responses:{"200":jsonResponse("Signed out.","AuthResponse"),"403":errorResponse("Origin not allowed.")}}},
  "/api/practice": { post: { operationId: "mutatePractice", summary: "Save a practice attempt or explicitly attach evidence", description: "Immutable attempt saves and versioned requirement links. Producer/action/key retries are idempotent. Never runs code or changes readiness.", requestBody: {required: true, content: {"application/json": {schema: ref("PracticeCommand")}}}, responses: {"200": jsonResponse("Saved attempt.", "PracticeResponse"), "400": errorResponse("Invalid practice command."), "403": errorResponse("Origin is not allowed."), "404": errorResponse("Exercise, origin or attempt not found."), "409": errorResponse("Retry input or revision conflict."), "413": errorResponse("Body too large."), "503": errorResponse("Save not confirmed.")} } },
  "/api/personal-prep": { get: { operationId: "getPersonalPrep", summary: "Read local experience stories; empty on hosted installations", responses: { "200": jsonResponse("Local preparation stories.", "PersonalPrepResponse"), "503": errorResponse("Local story file is unavailable or invalid.") } } },
  "/api/health": { get: { operationId: "getHealth", summary: "Check app and database health", responses: { "200": jsonResponse("Application and PostgreSQL are ready.", "HealthResponse"), "503": jsonResponse("Database is unavailable.", "HealthResponse") } } },
  "/api/workspace": {
    get: { operationId: "getWorkspace", summary: "Read the workspace", responses: { "200": jsonResponse("Workspace state.", "WorkspaceResponse"), "503": errorResponse("Database is unavailable.") } },
    post: { operationId: "mutateWorkspace", summary: "Apply a workspace mutation", description: "Accepts the currently routed workspace mutation schema. A successful response is the mutation result. Browser origin checks also apply.", requestBody: { required: true, content: { "application/json": { schema: ref("WorkspaceMutation") } } }, responses: { "200": jsonResponse("Updated workspace state.", "WorkspaceResponse"), "400": jsonResponse("Invalid JSON or mutation.", "WorkspaceError"), "403": errorResponse("Origin is not allowed."), "413": errorResponse("Request body is too large."), "409": jsonResponse("Revision conflict or command key conflict.", "WorkspaceError"), "428": jsonResponse("Required command metadata is missing.", "WorkspaceError"), "503": jsonResponse("Save could not be confirmed.", "WorkspaceError") } },
  },
  "/api/targets": {
    get: { operationId: "getTargets", summary: "Read role plans and interview records", responses: { "200": jsonResponse("Target state.", "TargetsResponse"), "503": errorResponse("Target plans are unavailable.") } },
    post: { operationId: "mutateTargets", summary: "Apply a target mutation", description: "Accepts the currently routed target mutation schema. Browser origin checks also apply.", requestBody: { required: true, content: { "application/json": { schema: ref("TargetMutation") } } }, responses: { "200": jsonResponse("Updated target state.", "TargetsResponse"), "400": jsonResponse("Invalid JSON or mutation.", "TargetError"), "403": errorResponse("Origin is not allowed."), "413": errorResponse("Request body is too large."), "404": jsonResponse("Target role or linked record was not found.", "TargetError"), "409": jsonResponse("Revision conflict or command key conflict.", "TargetError"), "428": jsonResponse("Required command metadata is missing.", "TargetError"), "503": jsonResponse("Save could not be confirmed.", "TargetError") } },
  },
  "/api/career": { get: { operationId: "getCareerHistory", summary: "Read candidacies and record revisions", responses: { "200": jsonResponse("Career history.", "CareerResponse"), "503": errorResponse("Career history is unavailable.") } } },
  "/api/company-research": {
    get: { operationId: "getCompanyResearch", summary: "Read recent company research", description: "Returns tracked company research profiles and a bounded recent window of up to 100 runs, sources, and role suggestions. Full source captures remain internal and are included only in the local export.", responses: { "200": jsonResponse("Company research state.", "CompanyResearchResponse"), "503": errorResponse("Company research is unavailable.") } },
    post: { operationId: "mutateCompanyResearch", summary: "Create or refresh company research, or review a role suggestion", description: "Creates a company and queues public read-only research, updates a company's research profile and queues a refresh, or accepts/dismisses a suggested job. Accepting a suggestion creates a local prospect role and candidacy only after user action; it never applies to a job or changes another candidacy's stage. Browser same-origin checks apply.", requestBody: { required: true, content: { "application/json": { schema: ref("CompanyResearchCommand") } } }, responses: { "200": jsonResponse("Updated company research state.", "CompanyResearchResponse"), "400": errorResponse("Invalid research command."), "403": errorResponse("Origin is not allowed."), "404": errorResponse("Company or suggestion was not found."), "409": errorResponse("Duplicate company, stale suggestion, source, or review conflict."), "413": errorResponse("Body or research result is too large."), "503": errorResponse("Research command could not be confirmed.") } },
  },
  "/api/export": { get: { operationId: "exportWorkspace", summary: "Export the authenticated workspace", description: "Returns a JSON attachment containing workspace, target, career history, all company research records and captures, algorithm, reference, and coaching data. Export version 7, including practice snapshots, evidence revisions and retry receipts.", responses: { "200": { description: "JSON export attachment.", content: { "application/json": { schema: ref("ExportResponse") } } }, "503": errorResponse("Export is unavailable.") } } },
  "/api/algorithms": { get: { operationId: "listAlgorithms", summary: "List algorithm questions", responses: { "200": jsonResponse("Algorithm question bank.", "AlgorithmsResponse"), "503": errorResponse("Question library is unavailable.") } } },
  "/api/questions/{id}": { get: { operationId: "getQuestion", summary: "Read an algorithm question", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, ...queryParameters(questionDetailQuerySchema)], responses: { "200": jsonResponse("Question details and linked reference entries.", "QuestionDetailResponse"), "400": errorResponse("Invalid query parameters."), "404": errorResponse("Question was not found."), "503": errorResponse("Question library is unavailable.") } } },
  "/api/questions/match": { post: { operationId: "matchQuestion", summary: "Match submitted text to the local question bank", description: "Matching can use local or semantic mode. Submitted content is not saved by this endpoint. The requestId is correlation only.", requestBody: { required: true, content: { "application/json": { schema: ref("QuestionMatchRequest") } } }, responses: { "200": jsonResponse("Match result, including clarification or no-match status.", "QuestionMatchResponse"), "400": errorResponse("Invalid JSON or request."), "403": errorResponse("Origin is not allowed."), "413": errorResponse("Request body is too large."), "429": errorResponse("Matcher is busy."), "503": errorResponse("Question matching is unavailable.") } } },
  "/api/code/review": { post: { operationId: "reviewCode", summary: "Review submitted code", description: "Uses an explicit provider request. Submitted code is not saved or executed. The requestId is correlation only.", requestBody: { required: true, content: { "application/json": { schema: ref("CodeReviewRequest") } } }, responses: { "200": jsonResponse("Static review result. execution.status is always not_run.", "CodeReviewResponse"), "400": errorResponse("Invalid JSON or review request."), "403": errorResponse("Origin is not allowed."), "404": errorResponse("Question was not found."), "413": errorResponse("Request body is too large."), "429": errorResponse("Review capacity or provider rate limit reached."), "502": errorResponse("Provider or review failure."), "503": errorResponse("Provider, key, or database unavailable."), "504": errorResponse("Provider timeout.") } } },
  "/api/coach": {
    get: { operationId: "getCoachingHistory", summary: "Read saved coaching and provider configuration", parameters: [{ name: "questionId", in: "query", required: false, schema: { type: "string" } }], responses: { "200": jsonResponse("Saved coaching history and configuration status.", "CoachingHistoryResponse"), "503": errorResponse("Coaching history is unavailable.") } },
    post: { operationId: "createCoaching", summary: "Create and save a coaching response", description: "Calls the configured provider and saves the completed response to local storage. Coaching history is distinct from ephemeral question matching and code review.", requestBody: { required: true, content: { "application/json": { schema: ref("CoachingRequest") } } }, responses: { "200": jsonResponse("Saved coaching response.", "CoachingResponse"), "400": errorResponse("Invalid coaching request."), "403": errorResponse("Origin is not allowed."), "404": errorResponse("Question was not found."), "413": errorResponse("Request body is too large."), "429": errorResponse("Another coaching request is active."), "502": errorResponse("Provider or persistence failure."), "503": errorResponse("Provider key or database unavailable.") } },
  },
  "/api/knowledge": { get: { operationId: "listKnowledge", summary: "Search reference entries", parameters: queryParameters(knowledgeQuerySchema), responses: { "200": jsonResponse("Matching reference entries.", "KnowledgeListResponse"), "400": errorResponse("Invalid or repeated query parameters."), "503": errorResponse("Reference library is unavailable.") } } },
  "/api/knowledge/{id}": { get: { operationId: "getKnowledgeEntry", summary: "Read one reference entry", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" } }], responses: { "200": jsonResponse("Reference entry.", "KnowledgeDetailResponse"), "400": errorResponse("Invalid ID or query parameters."), "404": errorResponse("Reference entry was not found."), "503": errorResponse("Reference library is unavailable.") } } },
  "/api/resume": { get: { operationId: "getResumePdf", summary: "Read the local resume PDF", description: "Returns a local PDF when available. The response is private and is not included in the OpenAPI document examples.", responses: { "200": { description: "PDF document.", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } }, "404": errorResponse("Resume PDF is unavailable.") } } },
};

export function createOpenApiDocument() {
  const components: Record<string, Record<string, unknown>> = {};
  for (const [name, schema] of Object.entries(apiSchemas)) components[name] = jsonSchema(schema);
  return {
    openapi: "3.1.0",
    info: {
      title: "Deems API",
      version: "1.0.0",
      description: "Deems API. Hosted workspace and data routes require a verified Cognito session. Authentication and fixed-location login weather routes are public. Loopback local mode is unauthenticated unless explicitly enabled.",
    },
    servers: [{ url: "/", description: "Same origin as the local Deems app." }],
    paths,
    components: { schemas: components },
  };
}
