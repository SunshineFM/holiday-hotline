/* eslint-disable @next/next/no-img-element -- Private uploaded photos use their original storage URL. */
"use client";
import { useState, useEffect, useRef } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowRight,
  ShoppingBag,
  Mail,
  ImagePlus,
  Check,
  Clock3,
  LogOut,
  Plus,
  ShieldCheck,
  Mic,
  Square,
} from "lucide-react";
type Request = Doc<"requests">;
const labels: Record<string, string> = {
  waiting: "Needs a check",
  queued: "Ready to send",
  sending: "Sending email",
  sent: "Sent to email provider",
  preview: "Reply preview ready",
  failed: "Email needs attention",
  uncertain: "Check email delivery",
};
const quickReplies = {
  available: {
    label: "In stock",
    message: (item: string) =>
      `Yes, we have ${item} in stock right now. We’ll be glad to help when you arrive.`,
  },
  unavailable: {
    label: "Not here",
    message: (item: string) =>
      `I’m sorry, ${item} is not in stock right now. I can help you find a close alternative.`,
  },
  checking: {
    label: "Checking",
    message: () =>
      "I’m checking this now and will update you once I have the details.",
  },
  alternative: {
    label: "Alternative",
    message: () =>
      "I found a close alternative that may work well. I’m happy to share the details.",
  },
  photo: {
    label: "Add a photo",
    message: () => "I’ve attached a photo so you can take a closer look.",
  },
} satisfies Record<string, { label: string; message: (item: string) => string }>;
type QuickReply = keyof typeof quickReplies;
const helperStatuses = {
  ready: "Ready",
  "with-shopper": "Helping",
  off: "Not staffed",
} as const;
const helperStatusDescriptions = {
  ready: "An associate is available to review new questions.",
  "with-shopper": "An associate is currently helping another shopper.",
  off: "No associate is monitoring questions right now. Holiday Helper can still answer approved updates.",
} as const;
type HelperStatus = keyof typeof helperStatuses;
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<
      { isFinal: boolean; 0: { transcript: string } }
    >;
  }) => void) | null;
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
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}
function errorText(e: unknown) {
  return e instanceof Error
    ? e.message.replace(/\[CONVEX[^\]]*\]\s*/g, "").slice(0, 250)
    : "Something went wrong. Please try again.";
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
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [login, setLogin] = useState(false),
    [setup, setSetup] = useState(false);
  async function demo() {
    setBusy(true);
    setError("");
    try {
      await signIn("anonymous");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (isLoading || (isAuthenticated && store === undefined))
    return (
      <section className="desk">
        <p role="status">Opening your associate desk…</p>
      </section>
    );
  if (!isAuthenticated)
    return (
      <section className="desk">
        <div className="desk-heading">
          <div>
            <div className="eyebrow">THE ASSOCIATE DESK</div>
            <h1>
              A quick check.
              <br />
              <em>A happy shopper.</em>
            </h1>
          </div>
          <ShieldCheck size={34} />
        </div>
        <div className="welcome-grid">
          <div className="welcome-card">
            <span className="pill">TRY THE WORKFLOW</span>
            <h2>A little practice before the rush.</h2>
            <p>
              Open your own sample store. Add a shopper’s question, check an
              item, and preview the reply. No real calls or emails are sent.
            </p>
            <button className="primary" disabled={busy} onClick={demo}>
              Open the demo desk <ArrowRight size={17} />
            </button>
          </div>
          <div className="welcome-card light">
            <h2>Working in the store?</h2>
            <p>
              Sign in to see your shoppers’ requests and send them a personal
              answer.
            </p>
            {!login ? (
              <button className="secondary" onClick={() => setLogin(true)}>
                Associate sign-in <ArrowRight size={16} />
              </button>
            ) : (
              <form
                className="login-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await signIn("password", new FormData(e.currentTarget));
                  } catch (err) {
                    setError(errorText(err));
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
                    Store invitation
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
                  onClick={() => setSetup(!setup)}
                >
                  {setup
                    ? "I already have an account"
                    : "I have a store invitation"}
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
          answers. The phone line can be connected after the information is
          checked.
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await activatePilot();
            } catch (e) {
              setError(errorText(e));
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
          Create a private demo store with sample holiday answers. Your practice
          requests stay in this session’s workspace.
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await startDemo();
            } catch (e) {
              setError(errorText(e));
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
  store: Doc<"stores">;
  onSignOut: () => void;
}) {
  const requests = useQuery(api.requests.list, { storeId: store._id });
  const addExample = useMutation(api.requests.addExample);
  const presence = useQuery(api.presence.mine, { storeId: store._id });
  const setPresence = useMutation(api.presence.set);
  const [section, setSection] = useState("requests"),
    [selected, setSelected] = useState<Id<"requests"> | null>(null),
    [filter, setFilter] = useState("waiting"),
    [busy, setBusy] = useState(false),
    [presenceBusy, setPresenceBusy] = useState(false),
    [error, setError] = useState("");
  const all = requests ?? [],
    visible = all.filter((r) => filter === "all" || r.status === "waiting");
  const current = all.find((r) => r._id === selected) ?? visible[0];
  const helperStatus = presence?.status ?? "off";
  async function changeHelperStatus(status: HelperStatus) {
    setPresenceBusy(true);
    setError("");
    try {
      await setPresence({ storeId: store._id, status });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPresenceBusy(false);
    }
  }
  async function example(kind: "shirt" | "gift" | "size") {
    setBusy(true);
    setError("");
    try {
      const id = await addExample({
        storeId: store._id,
        example: kind,
        requestKey: crypto.randomUUID(),
      });
      setSelected(id);
      setFilter("waiting");
    } catch (e) {
      setError(errorText(e));
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
    const c = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "read_visible_shopping_requests",
          description:
            "Read the current signed-in store's visible shopping requests. Does not send messages or change requests.",
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
            return visible.map((r) => ({
              id: r._id,
              item: r.item,
              timeframe: r.timeframe,
              status: r.status,
            }));
          },
        },
        { signal: c.signal },
      ),
    ).catch(() => {});
    return () => c.abort();
  }, [visible]);
  return (
    <section className="desk working">
      <div className="desk-top">
        <div>
          <div className="eyebrow">
            {store.isDemo ? "YOUR PRIVATE DEMO STORE" : "YOUR STORE"}
          </div>
          <h1>
            {store.name}
            <span className="brand-star">✳</span>
          </h1>
        </div>
        <div className="desk-actions">
          <div className="helper-status" role="group" aria-label="Holiday Helper line status">
            <span>Holiday Helper line</span>
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
          Practice mode · Fictional store information. Replies are previews; no
          calls or emails are sent.
        </div>
      )}
      <div className="desk-tabs">
        <button
          className={section === "requests" ? "active" : ""}
          onClick={() => setSection("requests")}
        >
          Shopper requests{" "}
          <span>{all.filter((r) => r.status === "waiting").length}</span>
        </button>
        <button
          className={section === "facts" ? "active" : ""}
          onClick={() => setSection("facts")}
        >
          Live updates
        </button>
      </div>
      {section === "facts" ? (
        <Facts store={store} />
      ) : (
        <>
          <div className="queue-toolbar">
            <div className="segmented">
              <button
                className={filter === "waiting" ? "active" : ""}
                onClick={() => {
                  setFilter("waiting");
                  setSelected(null);
                }}
              >
                Needs a check
              </button>
              <button
                className={filter === "all" ? "active" : ""}
                onClick={() => {
                  setFilter("all");
                  setSelected(null);
                }}
              >
                Recent requests
              </button>
            </div>
            {store.isDemo && (
              <button
                className="secondary small"
                disabled={busy}
                onClick={() => example("shirt")}
              >
                <Plus size={16} />
                Example inquiry
              </button>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {requests === undefined ? (
            <p role="status">Loading shopper requests…</p>
          ) : !visible.length ? (
            <div className="empty">
              <ShoppingBag size={34} />
              <h2>
                {all.length ? "All caught up." : "A little room to breathe."}
              </h2>
              <p>
                {all.length
                  ? "Your replies are saved under Recent requests."
                  : "Questions that need an associate will appear here."}
              </p>
              {store.isDemo && (
                <div className="example-options">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => example("shirt")}
                  >
                    Try an availability check
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => example("gift")}
                  >
                    Try a gift request
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => example("size")}
                  >
                    Try a photo request
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="queue">
              <aside className="request-list" aria-label="Shopping requests">
                {visible.map((r) => (
                  <button
                    key={r._id}
                    className={
                      current?._id === r._id
                        ? "request-row active"
                        : "request-row"
                    }
                    onClick={() => setSelected(r._id)}
                  >
                    <span className="row-label">
                      <Clock3 size={13} />
                      {r.timeframe}
                    </span>
                    <strong>{r.item}</strong>
                    <span>
                      {r.shopper} · {labels[r.status]}
                    </span>
                  </button>
                ))}
              </aside>
              {current && (
                <Reply key={current._id} request={current} store={store} />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
function Reply({
  request: r,
  store,
}: {
  request: Request;
  store: Doc<"stores">;
}) {
  const reply = useMutation(api.requests.reply),
    getUpload = useMutation(api.requests.generateUploadUrl),
    register = useMutation(api.requests.registerPhoto);
  const photo = useQuery(api.requests.photo, { id: r._id });
  const [availability, setAvailability] = useState<QuickReply>("available"),
    [answer, setAnswer] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [isQuickCopy, setIsQuickCopy] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function chooseQuickReply(value: QuickReply) {
    setAvailability(value);
    if (!answer.trim() || isQuickCopy) {
      setAnswer(quickReplies[value].message(r.item));
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
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok)
          throw Error("Photo upload failed. Your answer is still here.");
        photoId = ((await res.json()) as { storageId: Id<"_storage"> })
          .storageId;
        await register({ storeId: store._id, storageId: photoId! });
      }
      await reply({
        id: r._id,
        answer,
        availability,
        ...(photoId ? { photoId } : {}),
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="reply-panel">
      <div className="reply-top">
        <span className="eyebrow">
          {r.isDemo ? "EXAMPLE SHOPPER REQUEST" : "FROM HOLIDAY HELPER"}
        </span>
        <span className="pill">{labels[r.status]}</span>
      </div>
      <h2>{r.item}</h2>
      <p className="shopper-question">“{r.detail}”</p>
      <div className="request-meta">
        <span>
          <Clock3 size={16} />
          {r.timeframe}
        </span>
        <span>
          <Mail size={16} />
          {r.isDemo ? "Email preview" : r.email}
        </span>
      </div>
      {r.status === "waiting" ? (
        <>
          <div className="divider" />
          <h3>Choose a quick move</h3>
          <p className="help">
            Pick the closest response to start a note. Review it before you send
            it to the shopper.
          </p>
          <div
            className="quick-moves"
            role="group"
            aria-label="Quick shopper response"
          >
            {(Object.entries(quickReplies) as [
              QuickReply,
              (typeof quickReplies)[QuickReply],
            ][]).map(([value, quickReply]) => (
              <button
                key={value}
                aria-pressed={availability === value}
                className={availability === value ? "active" : ""}
                onClick={() => chooseQuickReply(value)}
              >
                {availability === value && <Check size={14} />} {quickReply.label}
              </button>
            ))}
          </div>
          <label className="reply-label" htmlFor="answer">
            Message to the shopper
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setIsQuickCopy(false);
            }}
            maxLength={2000}
            rows={4}
            placeholder="e.g. Yes, we have the blue shirt in medium. It’s $68. Ask for us when you arrive."
          />
          <div className="reply-actions">
            <label className="photo-input">
              <ImagePlus size={18} />
              {file ? file.name : "Add a photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <button className="text-button" onClick={() => setFile(null)}>
                Remove
              </button>
            )}
            <button
              className="primary"
              disabled={busy || !answer.trim()}
              onClick={send}
            >
              {busy
                ? "Saving…"
                : r.isDemo
                  ? "Preview shopper reply"
                  : "Send to shopper"}
              <ArrowRight size={17} />
            </button>
          </div>
          <p className="fine">
            This message goes to the shopper. Keep internal notes out and only
            send information you have confirmed.
            {!r.isDemo &&
              " Pilot request details are removed from Holiday Helper after seven days."}
          </p>
        </>
      ) : (
        <div className="saved-reply">
          <div className="eyebrow">
            <Check size={15} />
            {r.isDemo ? "SHOPPER’S EMAIL PREVIEW" : "ASSOCIATE’S SAVED REPLY"}
          </div>
          <h3>A little update from {store.name}.</h3>
          <p>{r.answer}</p>
          {photo && (
            <img
              className="item-photo"
              src={photo}
              alt="Item photo supplied by the store associate"
            />
          )}
          <p className="fine">
            Availability can change. This is not a reservation.
          </p>
          {r.isDemo ? (
            <p className="preview-stamp">Preview only · No email was sent</p>
          ) : (
            <p className="help">
              {labels[r.status]}. {r.deliveryError}
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
function Facts({ store }: { store: Doc<"stores"> }) {
  const save = useMutation(api.stores.saveFacts),
    draftLiveUpdate = useAction(api.onboarding.draftLiveUpdate),
    importWebsite = useAction(api.onboarding.importWebsite);
  const [facts, setFacts] = useState(store.facts),
    [update, setUpdate] = useState(""),
    [busy, setBusy] = useState(false),
    [listening, setListening] = useState(false),
    [startingFresh, setStartingFresh] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const recognition = useRef<BrowserSpeechRecognition | null>(null);
  useEffect(
    () => () => {
      recognition.current?.abort();
      recognition.current = null;
    },
    [],
  );
  function dictateUpdate() {
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
    const nextRecognition = new Recognition();
    recognition.current = nextRecognition;
    nextRecognition.continuous = false;
    nextRecognition.interimResults = false;
    nextRecognition.lang = "en-US";
    nextRecognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (spoken)
        setUpdate((current) =>
          `${current}${current.trim() ? " " : ""}${spoken}`.slice(0, 2000),
        );
    };
    nextRecognition.onerror = (event) => {
      if (event.error !== "aborted")
        setError(
          event.error === "not-allowed"
            ? "Please allow microphone access to dictate an update."
            : "Dictation could not hear that. You can try again or type the update.",
        );
    };
    nextRecognition.onend = () => {
      if (recognition.current === nextRecognition) recognition.current = null;
      setListening(false);
    };
    try {
      nextRecognition.start();
      setListening(true);
    } catch {
      setError("Dictation is already starting. Please try again in a moment.");
    }
  }
  async function preparePublicDrafts() {
    if (!store.website) {
      setError("A public website has not been connected to this desk yet.");
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
      const reviewDrafts = audit.facts.slice(0, 25 - facts.length);
      if (!reviewDrafts.length) {
        setNotice(audit.summary);
        return;
      }
      setFacts([...reviewDrafts, ...facts]);
      setNotice(
        `${audit.summary} ${reviewDrafts.length === 1 ? "One holiday draft is" : `${reviewDrafts.length} holiday drafts are`} at the top for manager approval.`,
      );
    } catch (e) {
      setError(errorText(e));
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
            Reception runs the call. This is the only place your team updates
            what callers should hear.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="text-button reset-plan">Start a clean holiday plan</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start a clean holiday plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This prepares a blank review queue. The current answers remain
                on the phone line until you save the clean plan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep current plan</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setFacts([]);
                  setUpdate("");
                  setStartingFresh(true);
                  setError("");
                  setNotice(
                    "Clean holiday plan ready. Add the current holiday brief, then save when it is complete.",
                  );
                }}
              >
                Prepare clean plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <form
        className="live-update-card"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!update.trim() || facts.length >= 25) return;
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const drafts = await draftLiveUpdate({
              storeId: store._id,
              update,
            });
            const availableSlots = 25 - facts.length;
            const reviewDrafts = drafts.slice(0, availableSlots);
            setFacts([...reviewDrafts, ...facts]);
            setUpdate("");
            setNotice(
              `${reviewDrafts.length === 1 ? "Your review draft is" : `${reviewDrafts.length} review drafts are`} at the top. Approve and save the ones that are accurate.`,
            );
          } catch (e) {
            const note = update.trim();
            if (note) {
              setFacts([
                {
                  question: "What should callers know about this update?",
                  answer: note,
                  source: "Manager update",
                  approved: false,
                },
                ...facts,
              ]);
              setUpdate("");
              setNotice(
                "Your update is ready for review at the top. Approve it and save when it is accurate.",
              );
            }
            if (!note) setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <span className="pill">TODAY’S UPDATE</span>
          <h3>What should Holiday Helper know for the holiday season?</h3>
          <p>
            Speak or type one holiday brief: hours, closures, an event, or
            something callers should know while your team is busy.
          </p>
        </div>
        <div className="holiday-focus" aria-label="Holiday information to include when relevant">
          <span>Hours &amp; closures</span>
          <span>Availability &amp; service</span>
          <span>Pickup, wrapping &amp; deadlines</span>
          <span>Returns &amp; exceptions</span>
        </div>
        <div className="source-of-truth">
          <Clock3 size={19} />
          <div>
            <strong>Holiday hours come from this approved update.</strong>
            <p>
              A website audit can flag a possible mismatch, but it never
              changes the line automatically. Your confirmed update does.
            </p>
          </div>
        </div>
        {!store.isDemo && (
          <button
            type="button"
            className="text-button public-review"
            disabled={busy || facts.length >= 25}
            onClick={() => void preparePublicDrafts()}
          >
            Review public website as a starting point
          </button>
        )}
        <label>
          Your update
          <textarea
            value={update}
            onChange={(e) => setUpdate(e.target.value)}
            maxLength={2000}
            rows={4}
            required
            placeholder="e.g. Thanksgiving week: open until 7 Thursday and Friday; closed Thanksgiving Day. Gift wrapping is available through Dec. 24. For a specific item, Holiday Helper should ask an associate to check."
          />
        </label>
        <button
          type="button"
          className={listening ? "secondary dictation listening" : "secondary dictation"}
          aria-pressed={listening}
          onClick={dictateUpdate}
        >
          {listening ? <Square size={15} /> : <Mic size={17} />}
          {listening ? "Listening — tap to stop" : "Dictate an update"}
        </button>
        <button
          className="primary"
          disabled={busy || !update.trim() || facts.length >= 25}
        >
          <Plus size={17} />
          {busy ? "Preparing…" : "Prepare for approval"}
        </button>
        <p className="fine">
          Holiday Helper makes only the few review drafts this brief needs.
          Nothing changes on the phone line until you approve and save them.
        </p>
      </form>
      {startingFresh && (
        <p className="replacement-note">
          Saving this plan replaces the currently approved answers on the phone
          line.
        </p>
      )}
      <div className="facts-list-heading">
        <h3>Review queue</h3>
        <p>New drafts appear first. Approved updates are the only answers Holiday Helper can use.</p>
      </div>
      {facts.map((f, i) => (
        <div className="fact-card" key={i}>
          <div className="fact-count">{String(i + 1).padStart(2, "0")}</div>
          <div className="fact-fields">
            <label>
              Question Holiday Helper can recognize
              <input
                value={f.question}
                maxLength={300}
                onChange={(e) =>
                  setFacts(
                    facts.map((x, j) =>
                      i === j ? { ...x, question: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <label>
              Caller-facing answer
              <textarea
                value={f.answer}
                rows={3}
                maxLength={2000}
                onChange={(e) =>
                  setFacts(
                    facts.map((x, j) =>
                      i === j ? { ...x, answer: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <div className="fact-bottom">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={f.approved}
                  onChange={(e) =>
                    setFacts(
                      facts.map((x, j) =>
                        i === j ? { ...x, approved: e.target.checked } : x,
                      ),
                    )
                  }
                />
                Approved for the phone line
              </label>
              <button
                className="text-button"
                onClick={() => setFacts(facts.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
            <label>
              Use through (optional)
              <input
                type="date"
                value={
                  f.expiresAt
                    ? new Date(f.expiresAt - 8 * 60 * 60 * 1000)
                        .toISOString()
                        .slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setFacts(
                    facts.map((x, j) =>
                      i === j
                        ? {
                            ...x,
                            expiresAt: e.target.value
                              ? Date.parse(
                                  e.target.value + "T23:59:59.999-08:00",
                                )
                              : undefined,
                          }
                        : x,
                    ),
                  )
                }
              />
            </label>
            <p className="fine">
              Expires at the end of this date, Pacific standard time. Source:{" "}
              {f.source}
            </p>
          </div>
        </div>
      ))}
      <button
        className="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          setNotice("");
          try {
            await save({ storeId: store._id, facts });
            setStartingFresh(false);
            setNotice(
              "Holiday plan saved. Holiday Helper can use the approved information.",
            );
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Check size={17} />
        {busy ? "Saving…" : "Save approved updates"}
      </button>
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
    </div>
  );
}
