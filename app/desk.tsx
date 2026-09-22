/* eslint-disable @next/next/no-img-element -- Private uploaded photos use their original storage URL. */
"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Clock3,
  ImagePlus,
  LogOut,
  Mail,
  MessageCircleMore,
  Mic,
  Plus,
  ShieldCheck,
  Square,
  UserRoundCheck,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";

type Store = Doc<"stores">;
type Request = Doc<"requests">;
type Update = Doc<"updates">;
type Scope = "today" | "temporary" | "ongoing";
type ResponseKind = "answered" | "checking" | "alternative" | "photo";

const deliveryLabels: Record<string, string> = {
  waiting: "Needs a team member",
  queued: "Ready to send",
  sending: "Sending email",
  sent: "Sent to email provider",
  preview: "Practice reply ready",
  failed: "Email needs attention",
  uncertain: "Check email delivery",
};

const helperStatuses = {
  ready: "Ready",
  busy: "Helping",
  off: "Away",
} as const;
type HelperStatus = keyof typeof helperStatuses;
const helperStatusDescriptions = {
  ready: "A person is ready if a caller needs help beyond the live updates.",
  busy: "A person is helping someone now. Holiday Helper can continue answering approved updates.",
  off: "No one is monitoring requests. Holiday Helper only uses approved updates.",
} as const;

const responseChoices: Record<
  ResponseKind,
  { label: string; message: (topic: string) => string }
> = {
  answered: {
    label: "I checked it",
    message: (topic) =>
      `I checked your question about ${topic}. Here is the current information: `,
  },
  checking: {
    label: "Checking now",
    message: () =>
      "A team member is checking this now. We will send the confirmed information as soon as it is available.",
  },
  alternative: {
    label: "Offer an option",
    message: () => "Here is a current option that may help: ",
  },
  photo: {
    label: "Add a photo",
    message: () => "We have attached a photo with the current information.",
  },
};

const scopeCopy: Record<Scope, { label: string; note: string }> = {
  today: {
    label: "Today only",
    note: "It leaves the phone line at the end of today.",
  },
  temporary: {
    label: "Temporary",
    note: "It leaves the phone line on the date you choose.",
  },
  ongoing: {
    label: "Ongoing",
    note: "It remains until a manager archives it.",
  },
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function speechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return (
    browserWindow.SpeechRecognition ??
    browserWindow.webkitSpeechRecognition ??
    null
  );
}

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message.replace(/\[CONVEX[^\]]*\]\s*/g, "").slice(0, 250)
    : "Something went wrong. Please try again.";
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function endOfLocalDate(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime();
}

export default function Desk() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const store = useQuery(api.stores.mine, isAuthenticated ? {} : "skip");
  const invitation = useQuery(
    api.stores.pilotInvitation,
    isAuthenticated ? {} : "skip",
  );
  const startDemo = useMutation(api.stores.startDemo);
  const activatePilot = useMutation(api.stores.activatePilot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(false);
  const [setup, setSetup] = useState(false);

  async function openDemo() {
    setBusy(true);
    setError("");
    try {
      await signIn("anonymous");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || (isAuthenticated && store === undefined))
    return (
      <section className="desk">
        <p role="status">Opening your manager desk…</p>
      </section>
    );

  if (!isAuthenticated)
    return (
      <section className="desk">
        <div className="desk-heading">
          <div>
            <div className="eyebrow">THE MANAGER DESK</div>
            <h1>
              Today’s details.
              <br />
              <em>One less interruption.</em>
            </h1>
          </div>
          <ShieldCheck size={34} />
        </div>
        <div className="welcome-grid">
          <div className="welcome-card">
            <span className="pill">TRY THE WORKFLOW</span>
            <h2>A practice location for the busy day.</h2>
            <p>
              Add one brief, approve what callers can hear, and handle one
              request that needs a person. No real calls or emails are sent.
            </p>
            <button className="primary" disabled={busy} onClick={openDemo}>
              Open the practice desk <ArrowRight size={17} />
            </button>
          </div>
          <div className="welcome-card light">
            <h2>Managing a real location?</h2>
            <p>
              Sign in to keep your callers’ current information and requests in
              one simple place.
            </p>
            {!login ? (
              <button className="secondary" onClick={() => setLogin(true)}>
                Manager sign-in <ArrowRight size={16} />
              </button>
            ) : (
              <form
                className="login-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await signIn("password", new FormData(event.currentTarget));
                  } catch (caught) {
                    setError(errorText(caught));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    autoComplete={setup ? "new-password" : "current-password"}
                    required
                  />
                </label>
                {setup && (
                  <label>
                    Location invitation
                    <input name="invitation" type="password" required />
                  </label>
                )}
                <input
                  name="flow"
                  type="hidden"
                  value={setup ? "signUp" : "signIn"}
                />
                <button className="primary" disabled={busy}>
                  {busy
                    ? "Opening…"
                    : setup
                      ? "Activate my invitation"
                      : "Sign in"}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSetup((current) => !current)}
                >
                  {setup
                    ? "I already have an account"
                    : "I have a location invitation"}
                </button>
              </form>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
    );

  if (!store && invitation)
    return (
      <section className="desk">
        <h1>Your organization desk.</h1>
        <p>
          Your private {invitation.name} desk is ready for manager-reviewed
          updates and caller requests.
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await activatePilot();
            } catch (caught) {
              setError(errorText(caught));
            } finally {
              setBusy(false);
            }
          }}
        >
          Open my desk <ArrowRight size={17} />
        </button>
        <button className="text-button" onClick={() => void signOut()}>
          Sign out
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    );

  if (!store)
    return (
      <section className="desk">
        <h1>Your practice desk.</h1>
        <p>
          Create a private practice location with sample updates. Nothing in a
          practice desk is sent to a caller.
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await startDemo();
            } catch (caught) {
              setError(errorText(caught));
            } finally {
              setBusy(false);
            }
          }}
        >
          Create my practice desk <ArrowRight size={17} />
        </button>
        <button className="text-button" onClick={() => void signOut()}>
          Sign out
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    );

  return <StoreDesk store={store} onSignOut={() => void signOut()} />;
}

function StoreDesk({
  store,
  onSignOut,
}: {
  store: Store;
  onSignOut: () => void;
}) {
  const updates = useQuery(api.updates.list, { storeId: store._id });
  const requests = useQuery(api.requests.list, { storeId: store._id });
  const presence = useQuery(api.presence.mine, { storeId: store._id });
  const migrateLegacyFacts = useMutation(api.updates.migrateLegacyFacts);
  const setPresence = useMutation(api.presence.set);
  const addExample = useMutation(api.requests.addExample);
  const [section, setSection] = useState<"brief" | "requests">("brief");
  const [selected, setSelected] = useState<Id<"requests"> | null>(null);
  const [filter, setFilter] = useState<"waiting" | "all">("waiting");
  const [busy, setBusy] = useState(false);
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [error, setError] = useState("");
  const attemptedMigration = useRef(false);

  useEffect(() => {
    if (
      attemptedMigration.current ||
      updates === undefined ||
      updates.length ||
      !store.facts?.length
    )
      return;
    attemptedMigration.current = true;
    void migrateLegacyFacts({ storeId: store._id }).catch(() => {});
  }, [migrateLegacyFacts, store._id, store.facts?.length, updates]);

  const all = requests ?? [];
  const visible = all.filter(
    (request) => filter === "all" || request.status === "waiting",
  );
  const current = all.find((request) => request._id === selected) ?? visible[0];
  const rawStatus = presence?.status ?? "off";
  const helperStatus: HelperStatus =
    rawStatus === "with-shopper" ? "busy" : rawStatus;

  async function changeHelperStatus(status: HelperStatus) {
    setPresenceBusy(true);
    setError("");
    try {
      await setPresence({ storeId: store._id, status });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPresenceBusy(false);
    }
  }

  async function addPracticeRequest(example: "special" | "event" | "service") {
    setBusy(true);
    setError("");
    try {
      const id = await addExample({
        storeId: store._id,
        example,
        requestKey: crypto.randomUUID(),
      });
      setSelected(id);
      setFilter("waiting");
      setSection("requests");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!context) return;
    const controller = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "read_visible_caller_requests",
          description:
            "Read the current signed-in location's visible caller requests. Does not send messages or change requests.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input: unknown) {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("No arguments expected");
            return visible.map((request) => ({
              id: request._id,
              topic: request.item,
              timing: request.timeframe,
              status: request.status,
            }));
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {});
    return () => controller.abort();
  }, [visible]);

  return (
    <section className="desk working">
      <div className="desk-top">
        <div>
          <div className="eyebrow">
            {store.isDemo ? "YOUR PRIVATE PRACTICE LOCATION" : "YOUR LOCATION"}
          </div>
          <h1>
            {store.name}
            <span className="brand-star">✳</span>
          </h1>
        </div>
        <div className="desk-actions">
          <div
            className="helper-status"
            role="group"
            aria-label="Holiday Helper coverage"
          >
            <span>People available</span>
            {(Object.entries(helperStatuses) as [HelperStatus, string][]).map(
              ([status, label]) => (
                <button
                  key={status}
                  disabled={presenceBusy}
                  aria-pressed={helperStatus === status}
                  title={helperStatusDescriptions[status]}
                  className={helperStatus === status ? "active" : ""}
                  onClick={() => void changeHelperStatus(status)}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <button className="icon-button" onClick={onSignOut}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
      {store.isDemo && (
        <div className="notice">
          Practice mode · Fictional information. Replies stay previews, and no
          calls or emails are sent.
        </div>
      )}
      <div className="desk-tabs">
        <button
          className={section === "brief" ? "active" : ""}
          onClick={() => setSection("brief")}
        >
          Today’s brief
        </button>
        <button
          className={section === "requests" ? "active" : ""}
          onClick={() => setSection("requests")}
        >
          Caller requests{" "}
          <span>
            {all.filter((request) => request.status === "waiting").length}
          </span>
        </button>
      </div>
      {section === "brief" ? (
        <TodayBrief store={store} updates={updates} />
      ) : (
        <CallerRequests
          store={store}
          requests={requests}
          visible={visible}
          current={current}
          filter={filter}
          busy={busy}
          error={error}
          onFilter={setFilter}
          onSelect={setSelected}
          onPracticeRequest={addPracticeRequest}
        />
      )}
    </section>
  );
}

function CallerRequests({
  store,
  requests,
  visible,
  current,
  filter,
  busy,
  error,
  onFilter,
  onSelect,
  onPracticeRequest,
}: {
  store: Store;
  requests: Request[] | undefined;
  visible: Request[];
  current: Request | undefined;
  filter: "waiting" | "all";
  busy: boolean;
  error: string;
  onFilter: (value: "waiting" | "all") => void;
  onSelect: (id: Id<"requests"> | null) => void;
  onPracticeRequest: (value: "special" | "event" | "service") => Promise<void>;
}) {
  const all = requests ?? [];
  return (
    <>
      <div className="queue-toolbar">
        <div className="segmented">
          <button
            className={filter === "waiting" ? "active" : ""}
            onClick={() => {
              onFilter("waiting");
              onSelect(null);
            }}
          >
            Needs a person
          </button>
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => {
              onFilter("all");
              onSelect(null);
            }}
          >
            Recent requests
          </button>
        </div>
        {store.isDemo && (
          <button
            className="secondary small"
            disabled={busy}
            onClick={() => void onPracticeRequest("special")}
          >
            <Plus size={16} />
            Add practice request
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {requests === undefined ? (
        <p role="status">Loading caller requests…</p>
      ) : !visible.length ? (
        <div className="empty">
          <MessageCircleMore size={34} />
          <h2>{all.length ? "All caught up." : "A little room to breathe."}</h2>
          <p>
            {all.length
              ? "Completed replies are under Recent requests."
              : "Questions that need a person will appear here."}
          </p>
          {store.isDemo && (
            <div className="example-options">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void onPracticeRequest("special")}
              >
                Try a daily special
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void onPracticeRequest("event")}
              >
                Try an event change
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void onPracticeRequest("service")}
              >
                Try a service question
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="queue">
          <aside className="request-list" aria-label="Caller requests">
            {visible.map((request) => (
              <button
                key={request._id}
                className={
                  current?._id === request._id
                    ? "request-row active"
                    : "request-row"
                }
                onClick={() => onSelect(request._id)}
              >
                <span className="row-label">
                  <Clock3 size={13} />
                  {request.timeframe}
                </span>
                <strong>{request.item}</strong>
                <span>
                  {request.shopper} · {deliveryLabels[request.status]}
                </span>
              </button>
            ))}
          </aside>
          {current && <Reply request={current} store={store} />}
        </div>
      )}
    </>
  );
}

function Reply({ request, store }: { request: Request; store: Store }) {
  const reply = useMutation(api.requests.reply);
  const getUpload = useMutation(api.requests.generateUploadUrl);
  const register = useMutation(api.requests.registerPhoto);
  const photo = useQuery(api.requests.photo, { id: request._id });
  const [responseKind, setResponseKind] = useState<ResponseKind>("answered");
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isQuickCopy, setIsQuickCopy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function chooseResponse(kind: ResponseKind) {
    setResponseKind(kind);
    if (!answer.trim() || isQuickCopy) {
      setAnswer(responseChoices[kind].message(request.item));
      setIsQuickCopy(true);
    }
  }

  async function send() {
    setBusy(true);
    setError("");
    try {
      let photoId: Id<"_storage"> | undefined;
      if (file) {
        if (
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        )
          throw Error("Please choose a JPG, PNG, or WebP photo under 5 MB.");
        const url = await getUpload({ storeId: store._id });
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok)
          throw Error(
            "Photo upload failed. Your written response is still here.",
          );
        photoId = ((await response.json()) as { storageId: Id<"_storage"> })
          .storageId;
        await register({ storeId: store._id, storageId: photoId });
      }
      await reply({
        id: request._id,
        answer,
        responseKind,
        ...(photoId ? { photoId } : {}),
      });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="reply-panel">
      <div className="reply-top">
        <span className="eyebrow">
          {request.isDemo ? "PRACTICE CALLER REQUEST" : "FROM HOLIDAY HELPER"}
        </span>
        <span className="row-label">
          <Clock3 size={13} />
          {request.timeframe}
        </span>
      </div>
      <h2>{request.item}</h2>
      <p className="shopper-question">“{request.detail}”</p>
      <div className="request-meta">
        <span>
          <UserRoundCheck size={15} />
          {request.shopper}
        </span>
        <span>
          <Mail size={15} />
          {request.isDemo ? "Email preview" : request.email}
        </span>
      </div>
      <div className="divider" />
      {request.status === "waiting" ? (
        <>
          <h3>Give the team’s confirmed answer.</h3>
          <p className="help">
            Keep it factual and short. Email is used only when the caller has
            agreed to receive it.
          </p>
          <div className="quick-moves" aria-label="Suggested response">
            {(
              Object.entries(responseChoices) as [
                ResponseKind,
                (typeof responseChoices)[ResponseKind],
              ][]
            ).map(([kind, choice]) => (
              <button
                key={kind}
                className={responseKind === kind ? "active" : ""}
                onClick={() => chooseResponse(kind)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <label className="reply-label">
            Message to the caller
            <textarea
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                setIsQuickCopy(false);
              }}
              maxLength={2000}
              rows={5}
              placeholder="Write the current information the caller asked for."
            />
          </label>
          <div className="reply-actions">
            <label className="photo-input">
              <ImagePlus size={17} />
              {file ? file.name : "Attach a photo (optional)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button
              className="primary"
              disabled={busy || !answer.trim()}
              onClick={() => void send()}
            >
              {request.isDemo ? "Preview reply" : "Send email reply"}
              <ArrowRight size={17} />
            </button>
          </div>
          <p className="fine">
            Send only information your team has confirmed. Pilot request details
            are removed from Holiday Helper after seven days.
          </p>
        </>
      ) : (
        <div className="saved-reply">
          <div className="eyebrow">
            <Check size={15} />
            {request.isDemo ? "PRACTICE EMAIL PREVIEW" : "TEAM RESPONSE"}
          </div>
          <h3>An update from {store.name}.</h3>
          <p>{request.answer}</p>
          {photo && (
            <img
              className="item-photo"
              src={photo}
              alt="Photo supplied by the team"
            />
          )}
          {request.isDemo ? (
            <p className="preview-stamp">Preview only · No email was sent</p>
          ) : (
            <p className="help">
              {deliveryLabels[request.status]}. {request.deliveryError}
            </p>
          )}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

function TodayBrief({
  store,
  updates,
}: {
  store: Store;
  updates: Update[] | undefined;
}) {
  const draftLiveUpdate = useAction(api.onboarding.draftLiveUpdate);
  const importWebsite = useAction(api.onboarding.importWebsite);
  const createDrafts = useMutation(api.updates.createDrafts);
  const [brief, setBrief] = useState("");
  const [scope, setScope] = useState<Scope>("today");
  const [through, setThrough] = useState(localDateValue());
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<BrowserSpeechRecognition | null>(null);
  const drafts = (updates ?? []).filter((update) => update.status === "draft");
  const live = (updates ?? []).filter((update) => update.status === "approved");

  useEffect(
    () => () => {
      recognition.current?.abort();
      recognition.current = null;
    },
    [],
  );

  function currentSchedule() {
    return {
      effectiveAt: Date.now(),
      ...(scope === "ongoing" ? {} : { expiresAt: endOfLocalDate(through) }),
    };
  }

  function dictateBrief() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setError(
        "Dictation is not available in this browser. You can still type the update.",
      );
      return;
    }
    setError("");
    const next = new Recognition();
    recognition.current = next;
    next.continuous = false;
    next.interimResults = false;
    next.lang = "en-US";
    next.onresult = (event) => {
      const spoken = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (spoken)
        setBrief((current) =>
          `${current}${current.trim() ? " " : ""}${spoken}`.slice(0, 2000),
        );
    };
    next.onerror = (event) => {
      if (event.error !== "aborted")
        setError(
          event.error === "not-allowed"
            ? "Please allow microphone access to dictate an update."
            : "Dictation could not hear that. Try again or type the update.",
        );
    };
    next.onend = () => {
      if (recognition.current === next) recognition.current = null;
      setListening(false);
    };
    try {
      next.start();
      setListening(true);
    } catch {
      setError("Dictation is already starting. Please try again in a moment.");
    }
  }

  async function createManagerDrafts(event: React.FormEvent) {
    event.preventDefault();
    if (!brief.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    const schedule = currentSchedule();
    try {
      let generated;
      try {
        generated = await draftLiveUpdate({
          storeId: store._id,
          update: brief,
        });
      } catch {
        generated = [
          {
            question: "What should callers know right now?",
            answer: brief.trim(),
          },
        ];
      }
      await createDrafts({
        storeId: store._id,
        briefText: brief,
        scope,
        ...schedule,
        source: "manager",
        drafts: generated.map(({ question, answer }) => ({ question, answer })),
      });
      setBrief("");
      setNotice(
        "Your review drafts are ready below. Nothing reaches callers until you approve an update.",
      );
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function reviewWebsite() {
    if (!store.website) {
      setError("A public website has not been connected to this location yet.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const audit = await importWebsite({
        storeId: store._id,
        url: store.website,
      });
      if (!audit.facts.length) {
        setNotice(audit.summary);
        return;
      }
      await createDrafts({
        storeId: store._id,
        briefText: `Public website review: ${store.website}`,
        scope: "temporary",
        effectiveAt: Date.now(),
        expiresAt: endOfLocalDate(through),
        source: "website",
        drafts: audit.facts.map(({ question, answer }) => ({
          question,
          answer,
        })),
      });
      setNotice(
        `${audit.summary} Review the suggested updates below before putting anything on the line.`,
      );
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="facts">
      <div className="facts-heading">
        <div>
          <h2>One place to keep Holiday Helper current.</h2>
          <p>
            Reception handles the conversation. This desk is the only place your
            team changes what callers hear.
          </p>
        </div>
      </div>
      <form className="live-update-card" onSubmit={createManagerDrafts}>
        <div>
          <span className="pill">TODAY’S BRIEF</span>
          <h3>What is different right now?</h3>
          <p>
            Say it naturally: a closure, special, event, service issue,
            promotion, or anything callers should know before taking your team’s
            time.
          </p>
        </div>
        <div className="brief-flow">
          <span>1. Speak or type it</span>
          <ArrowRight size={15} />
          <span>2. Review it</span>
          <ArrowRight size={15} />
          <span>3. Put it on the line</span>
        </div>
        <div className="source-of-truth">
          <CalendarClock size={19} />
          <div>
            <strong>
              The manager’s approved brief is the live source of truth.
            </strong>
            <p>
              A website review can flag a possible mismatch, but it never
              changes the phone line on its own.
            </p>
          </div>
        </div>
        <div
          className="scope-picker"
          role="group"
          aria-label="How long this update should stay live"
        >
          {(
            Object.entries(scopeCopy) as [Scope, (typeof scopeCopy)[Scope]][]
          ).map(([value, copy]) => (
            <button
              type="button"
              key={value}
              className={scope === value ? "active" : ""}
              onClick={() => {
                setScope(value);
                if (value === "today") setThrough(localDateValue());
              }}
            >
              <strong>{copy.label}</strong>
              <span>{copy.note}</span>
            </button>
          ))}
        </div>
        {scope !== "ongoing" && (
          <label className="through-date">
            {scope === "today" ? "Use through" : "Use through (local time)"}
            <input
              type="date"
              value={through}
              min={localDateValue()}
              onChange={(event) => setThrough(event.target.value)}
              disabled={scope === "today"}
            />
          </label>
        )}
        {!store.isDemo && (
          <button
            type="button"
            className="text-button public-review"
            disabled={busy}
            onClick={() => void reviewWebsite()}
          >
            Review the public website as a starting point
          </button>
        )}
        <label>
          Your brief
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            maxLength={2000}
            rows={4}
            required
            placeholder="e.g. We are closed for the luncheon from noon to 2. The chef’s special is halibut. For seating after 5, please have a person check the floor."
          />
        </label>
        <button
          type="button"
          className={
            listening ? "secondary dictation listening" : "secondary dictation"
          }
          aria-pressed={listening}
          onClick={dictateBrief}
        >
          {listening ? <Square size={15} /> : <Mic size={17} />}
          {listening ? "Listening — tap to stop" : "Dictate a brief"}
        </button>
        <button className="primary" disabled={busy || !brief.trim()}>
          <Plus size={17} />
          {busy ? "Preparing…" : "Prepare for approval"}
        </button>
        <p className="fine">
          Holiday Helper prepares only the few caller answers your brief
          supports. A manager approves every one.
        </p>
      </form>
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="facts-list-heading">
        <div>
          <h3>Review queue</h3>
          <p>Drafts stay private until you put them on the phone line.</p>
        </div>
        <span className="counter">{drafts.length} waiting</span>
      </div>
      {updates === undefined ? (
        <p role="status">Loading your current information…</p>
      ) : drafts.length ? (
        drafts.map((update) => (
          <UpdateCard
            key={`${update._id}:${update._creationTime}:${update.status}:${update.question}:${update.answer}`}
            update={update}
          />
        ))
      ) : (
        <div className="small-empty">
          No drafts waiting. Add one short brief when something changes.
        </div>
      )}
      <div className="facts-list-heading live-heading">
        <div>
          <h3>On the phone line now</h3>
          <p>Only these current, approved updates can be used in a call.</p>
        </div>
        <span className="counter">{live.length} live</span>
      </div>
      {live.length ? (
        live.map((update) => (
          <UpdateCard
            key={`${update._id}:${update._creationTime}:${update.status}:${update.question}:${update.answer}`}
            update={update}
          />
        ))
      ) : (
        <div className="small-empty">No approved updates are live yet.</div>
      )}
    </div>
  );
}

function UpdateCard({ update }: { update: Update }) {
  const edit = useMutation(api.updates.edit);
  const setApproval = useMutation(api.updates.setApproval);
  const archive = useMutation(api.updates.archive);
  const [question, setQuestion] = useState(update.question);
  const [answer, setAnswer] = useState(update.answer);
  const [scope, setScope] = useState<Scope>(update.scope);
  const [through, setThrough] = useState(
    update.expiresAt
      ? localDateValue(new Date(update.expiresAt))
      : localDateValue(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function schedule() {
    return {
      effectiveAt: update.effectiveAt,
      ...(scope === "ongoing" ? {} : { expiresAt: endOfLocalDate(through) }),
    };
  }

  async function saveAnd(action?: "approve" | "draft") {
    setBusy(true);
    setError("");
    try {
      await edit({ id: update._id, question, answer, scope, ...schedule() });
      if (action)
        await setApproval({ id: update._id, approved: action === "approve" });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        update.status === "approved" ? "fact-card approved-card" : "fact-card"
      }
    >
      <div className="fact-count">
        {update.status === "approved" ? <Check size={23} /> : "01"}
      </div>
      <div className="fact-fields">
        <div className="update-card-head">
          <span className="pill">
            {update.status === "approved" ? "LIVE NOW" : "REVIEW DRAFT"}
          </span>
          <span className="source-label">
            {update.source === "website"
              ? "Public website suggestion"
              : update.source === "legacy"
                ? "Imported from original desk"
                : "Manager brief"}
          </span>
        </div>
        <label>
          Question Holiday Helper can recognize
          <input
            value={question}
            maxLength={300}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>
        <label>
          Caller-facing answer
          <textarea
            value={answer}
            rows={3}
            maxLength={2000}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </label>
        <div className="update-options">
          <label>
            Duration
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as Scope)}
            >
              <option value="today">Today only</option>
              <option value="temporary">Temporary</option>
              <option value="ongoing">Ongoing</option>
            </select>
          </label>
          {scope !== "ongoing" && (
            <label>
              Use through
              <input
                type="date"
                value={through}
                min={localDateValue()}
                disabled={scope === "today"}
                onChange={(event) => setThrough(event.target.value)}
              />
            </label>
          )}
        </div>
        <div className="fact-bottom">
          <div className="update-actions">
            <button
              className="secondary small"
              disabled={busy}
              onClick={() => void saveAnd()}
            >
              Save edit
            </button>
            {update.status === "draft" ? (
              <button
                className="primary small"
                disabled={busy}
                onClick={() => void saveAnd("approve")}
              >
                <Check size={16} /> Put on the line
              </button>
            ) : (
              <button
                className="secondary small"
                disabled={busy}
                onClick={() => void saveAnd("draft")}
              >
                Take off the line
              </button>
            )}
          </div>
          <button
            className="text-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await archive({ id: update._id });
              } catch (caught) {
                setError(errorText(caught));
              } finally {
                setBusy(false);
              }
            }}
          >
            Archive
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
