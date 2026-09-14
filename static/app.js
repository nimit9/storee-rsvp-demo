// ─────────────────────────────────────────────────────────────────────────
// Aanya & Dev RSVP — WhatsApp-style chat flow.
// Guest type is derived from a path slug (<domain>/:code), not a query param,
// so the URL doesn't read like a form link.
// ─────────────────────────────────────────────────────────────────────────

// These slugs determine the event flow shown to each demo guest.
const SLUGS = {
  demo: "all", // Haldi + Sangeet + Wedding + Reception
  "sangeet-demo": "sangeet", // Sangeet + Wedding + Reception
  "wedding-demo": "wedding", // Wedding + Reception
  "reception-demo": "reception", // Reception only
};

const EVENT_ORDER = {
  all: ["haldi", "sangeet", "wedding", "reception"],
  sangeet: ["sangeet", "wedding", "reception"],
  wedding: ["wedding", "reception"],
  reception: ["reception"],
};

// En dashes in the time ranges, and no spaces around them, so a range never
// wraps across two lines mid-phrase.
const EVENTS = {
  haldi: {
    notice:
      "Haldi · 27th December 2026 · 4:00–9:00 PM\nThe Ivory Lawns, Meadowbrook Estate",
    question: "Can we look forward to celebrating with you at the Haldi?",
  },
  sangeet: {
    notice:
      "Sangeet · 28th December 2026 · 6:00–11:00 PM\nThe Starlight Ballroom, Meadowbrook Estate",
    question: "Can we look forward to celebrating with you at the Sangeet?",
  },
  wedding: {
    notice: "Wedding · 30th December 2026 · 7:00–11:00 PM\nThe Rose Pavilion, Meadowbrook Estate",
    question: "Can we look forward to celebrating with you at the Wedding?",
  },
  reception: {
    notice:
      "Reception · 2nd January 2027 · 6:00–11:00 PM\nThe Grand Terrace, Meadowbrook Estate",
    question: "Can we look forward to celebrating with you at the Reception?",
  },
};

const YES = "Absolutely!";
const NO = "Sorry, I won't be able to make it";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildSteps(guestType) {
  const steps = [];
  steps.push({
    type: "greet",
    lines: [
      "Hi there! It's Aanya & Dev 💌",
      "So thrilled you're RSVP-ing, just a few quick taps.",
    ],
  });
  steps.push({
    type: "text",
    id: "name",
    question: "Can we please have your name?",
    placeholder: "Type your name",
  });
  steps.push({
    type: "text",
    id: "whatsapp",
    question: "And your WhatsApp number?",
    placeholder: "+971 50 123 4567",
    inputmode: "tel",
    numeric: true,
  });
  steps.push({
    type: "choice",
    id: "side",
    question: "Quick one, are you a friend or family of?",
    options: ["Aanya", "Dev", "Both"],
  });
  if (guestType === "all") {
    steps.push({
      type: "poll",
      id: "eventPoll",
      question:
        "We can't wait to celebrate with you! Please let us know which event(s) you'll be attending.",
      options: [
        {
          key: "haldi",
          label: "Haldi",
          detail: "27 Dec · 4–9 PM · The Ivory Lawns, Meadowbrook Estate",
        },
        {
          key: "sangeet",
          label: "Sangeet",
          detail: "28 Dec · 6–11 PM · The Starlight Ballroom, Meadowbrook Estate",
        },
        {
          key: "wedding",
          label: "Wedding",
          detail: "30 Dec · 7–11 PM · The Rose Pavilion, Meadowbrook Estate",
        },
        {
          key: "reception",
          label: "Reception",
          detail: "2 Jan · 6–11 PM · The Grand Terrace, Meadowbrook Estate",
        },
        { key: "none", label: "Sorry, can't make it to any of these", decline: true },
      ],
    });
  } else {
    for (const ev of EVENT_ORDER[guestType]) {
      steps.push({ type: "notice", text: EVENTS[ev].notice });
      steps.push({
        type: "choice",
        id: `attend_${ev}`,
        question: EVENTS[ev].question,
        options: [YES, NO],
      });
    }
  }
  steps.push(hasGuestsStep());
  steps.push({ type: "done" });
  return steps;
}

const MAX_GUESTS = 10;

function hasGuestsStep() {
  return {
    type: "choice",
    id: "hasGuests",
    question: "Do you have a relative / friend joining you?",
    options: ["No! Just me.", "Yes!"],
  };
}

function guestCountStep() {
  return {
    type: "text",
    id: "guestCount",
    question: "How many will be joining you?",
    placeholder: "e.g. 1",
    inputmode: "numeric",
    count: true,
  };
}

function guestNameStep(n, total) {
  return {
    type: "text",
    id: `guestName_${n}`,
    question: total === 1 ? "What's your guest's name?" : `What's guest ${n}'s name?`,
    placeholder: "Name",
  };
}

class ChatApp {
  constructor(root, code, guestType) {
    this.root = root;
    this.code = code;
    this.guestType = guestType;
    this.steps = buildSteps(guestType);
    this.stepIndex = 0;
    this.answers = {};
    this.rows = {}; // step id -> { bubble, editSlot, step }
    this.openEditId = null;
    this.finished = false;
    this.awaitingStepId = null; // id of the step whose controls are on-screen
    this.render();
  }

  render() {
    this.root.innerHTML = `
      <div class="phone">
        <div class="wa-header">
          <img src="/dp.jpg" alt="" />
          <div class="who">
            <span class="name">Aanya & Dev</span>
          </div>
          <a class="wa-dashboard-link" href="/dashboard" target="_blank" rel="noreferrer">Dashboard <span aria-hidden="true">↗</span></a>
        </div>
        <div class="wa-log" id="wa-log">
          <a class="storee-chat-badge" href="https://storeestudio.in" target="_blank" rel="noreferrer">Demo by Sto<span>ree</span></a>
        </div>
        <div class="wa-controls" id="wa-controls"></div>
      </div>
    `;
    this.log = this.root.querySelector("#wa-log");
    this.controls = this.root.querySelector("#wa-controls");
    // Whenever the controls area changes size (a new question's buttons/
    // input appear, or it clears), keep the latest message in view. Editing
    // a past answer doesn't touch this element, so it won't yank the guest
    // back down while they're correcting something further up.
    new ResizeObserver(() => this.scrollToBottom()).observe(this.controls);
    this.run();
  }

  scrollToBottom() {
    this.log.scrollTop = this.log.scrollHeight;
  }

  setTyping(on) {
    if (on) {
      const row = document.createElement("div");
      row.className = "typing-row";
      row.id = "typing-row";
      row.innerHTML = `<div class="typing-bubble"><span></span><span></span><span></span></div>`;
      this.log.appendChild(row);
    } else {
      const row = this.log.querySelector("#typing-row");
      if (row) row.remove();
    }
    this.scrollToBottom();
  }

  async botSay(text, opts = {}) {
    this.setTyping(true);
    await sleep(500 + Math.random() * 350);
    this.setTyping(false);
    const row = document.createElement("div");
    row.className = "bubble-row in";
    const bubble = document.createElement("div");
    bubble.className = opts.notice ? "bubble in notice" : "bubble in";
    bubble.appendChild(document.createTextNode(text));
    if (!opts.notice) bubble.appendChild(makeTimeSpan());
    row.appendChild(bubble);
    this.log.appendChild(row);
    this.scrollToBottom();
    await sleep(150);
  }

  // Appends the guest's answer as a bubble with a small edit pencil, and
  // an (initially empty) slot right after it for the inline editor.
  userSayEditable(step, text) {
    const row = document.createElement("div");
    row.className = "bubble-row out";

    const bubble = document.createElement("div");
    bubble.className = "bubble out";
    const textNode = document.createTextNode(text);
    bubble.appendChild(textNode);
    bubble.appendChild(makeTimeSpan());

    const pencil = document.createElement("button");
    pencil.type = "button";
    pencil.className = "wa-edit-pencil";
    pencil.innerHTML =
      '<svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>';
    pencil.setAttribute("aria-label", "Edit this answer");
    pencil.onclick = () => this.toggleEditor(step);

    const group = document.createElement("div");
    group.className = "bubble-group out";
    group.appendChild(pencil);
    group.appendChild(bubble);
    row.appendChild(group);

    const editSlot = document.createElement("div");
    editSlot.className = "wa-edit-slot";

    this.log.appendChild(row);
    this.log.appendChild(editSlot);
    this.scrollToBottom();

    this.rows[step.id] = { bubble, textNode, editSlot, row, step };
  }

  clearControls() {
    this.controls.innerHTML = "";
  }

  // If a guest declines every event they were asked about, asking whether
  // they'll have guests along no longer makes sense — drop the whole chain
  // (unless already answered).
  syncDeclineState() {
    const allDeclined = EVENT_ORDER[this.guestType].every(
      (ev) => this.answers[`attend_${ev}`] === NO,
    );
    this.declinedAll = allDeclined;
    const hasGuestsAnswered = this.answers.hasGuests !== undefined;
    if (allDeclined) {
      if (!hasGuestsAnswered) {
        this.steps = this.steps.filter(
          (s) =>
            s.id !== "hasGuests" &&
            s.id !== "guestCount" &&
            !(s.id && s.id.startsWith("guestName_")),
        );
      }
    } else if (!hasGuestsAnswered && !this.steps.some((s) => s.id === "hasGuests")) {
      const doneIdx = this.steps.findIndex((s) => s.type === "done");
      this.steps.splice(doneIdx, 0, hasGuestsStep());
    }
  }

  // Inserts/removes the `guestCount` question right after "will you have
  // guests" is answered — only touching it if it hasn't been answered yet.
  syncGuestCountStep() {
    const wantsGuests = this.answers.hasGuests === "Yes!";
    const countAnswered = this.answers.guestCount !== undefined;
    if (wantsGuests) {
      if (!countAnswered && !this.steps.some((s) => s.id === "guestCount")) {
        const idx = this.steps.findIndex((s) => s.id === "hasGuests");
        this.steps.splice(idx + 1, 0, guestCountStep());
      }
    } else if (!countAnswered) {
      this.steps = this.steps.filter((s) => {
        if (s.id === "guestCount") return false;
        if (s.id && s.id.startsWith("guestName_")) return this.answers[s.id] !== undefined;
        return true;
      });
    }
  }

  // Inserts/removes `guestCount` numbered name questions right after the
  // count is answered — only ever touching ones that haven't been answered
  // yet, so editing the count later never wipes a name already given.
  syncGuestNameSteps() {
    const parsed = parseInt((this.answers.guestCount || "").replace(/\D/g, ""), 10);
    const count = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), MAX_GUESTS) : 0;

    this.steps = this.steps.filter((s) => {
      if (!s.id || !s.id.startsWith("guestName_")) return true;
      if (this.answers[s.id] !== undefined) return true;
      return parseInt(s.id.split("_")[1], 10) <= count;
    });

    for (let n = 1; n <= count; n++) {
      const id = `guestName_${n}`;
      if (this.steps.some((s) => s.id === id)) continue;
      const afterId = n === 1 ? "guestCount" : `guestName_${n - 1}`;
      const idx = this.steps.findIndex((s) => s.id === afterId);
      this.steps.splice(idx + 1, 0, guestNameStep(n, count));
    }
  }

  async run() {
    while (this.stepIndex < this.steps.length) {
      const step = this.steps[this.stepIndex];
      if (step.type === "greet") {
        for (const line of step.lines) await this.botSay(line);
        this.stepIndex++;
        continue;
      }
      if (step.type === "notice") {
        await this.botSay(step.text, { notice: true });
        this.stepIndex++;
        continue;
      }
      if (step.type === "choice") {
        await this.botSay(step.question);
        await this.showChoice(step);
        return; // showChoice advances the flow itself once answered
      }
      if (step.type === "text") {
        await this.botSay(step.question);
        await this.showText(step);
        return;
      }
      if (step.type === "poll") {
        await this.showPoll(step);
        return;
      }
      if (step.type === "done") {
        await this.finish();
        return;
      }
    }
  }

  recordAnswer(step, value) {
    this.answers[step.id] = value;
    if (step.id === "hasGuests") this.syncGuestCountStep();
    if (step.id === "guestCount") this.syncGuestNameSteps();
    if (step.id.startsWith("attend_")) this.syncDeclineState();
  }

  showChoice(step) {
    return new Promise((resolve) => {
      this.clearControls();
      this.awaitingStepId = step.id;
      const control = this.buildChoiceControl(step, (opt) => {
        this.clearControls();
        this.recordAnswer(step, opt);
        this.userSayEditable(step, opt);
        this.stepIndex++;
        resolve();
        this.run();
      });
      this.controls.appendChild(control);
    });
  }

  showText(step) {
    return new Promise((resolve) => {
      this.clearControls();
      this.awaitingStepId = step.id;
      const control = this.buildTextControl(step, "", (value) => {
        this.clearControls();
        this.recordAnswer(step, value);
        this.userSayEditable(step, value);
        this.stepIndex++;
        resolve();
        this.run();
      });
      this.controls.appendChild(control);
    });
  }

  // A WhatsApp-style multi-select poll, rendered as its own bot bubble in
  // the log (not in the controls area) — matching how polls actually work
  // in WhatsApp. Selecting options fills in that event's Yes/No answer;
  // "Continue" (in the controls area, like every other step) confirms it.
  // A pencil appears once confirmed so it can be reopened later, same as
  // every other answer.
  showPoll(step) {
    return new Promise((resolve) => {
      this.setTyping(true);
      this.awaitingStepId = step.id;
      setTimeout(() => {
        this.setTyping(false);
        let confirmedOnce = false;
        const selected = new Set();

        const row = document.createElement("div");
        row.className = "bubble-row in";
        const poll = document.createElement("div");
        poll.className = "poll-bubble";

        const qRow = document.createElement("div");
        qRow.className = "poll-question-row";
        const q = document.createElement("div");
        q.className = "poll-question";
        q.textContent = step.question;
        const pencil = document.createElement("button");
        pencil.type = "button";
        pencil.className = "wa-edit-pencil poll-edit-pencil";
        pencil.innerHTML =
          '<svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>';
        pencil.setAttribute("aria-label", "Edit your selection");
        pencil.style.display = "none";
        qRow.append(q, pencil);
        poll.appendChild(qRow);

        const sub = document.createElement("div");
        sub.className = "poll-sub";
        sub.textContent = "Select one or more";
        poll.appendChild(sub);

        const optionUI = {}; // key -> { circle, bar }
        const setChecked = (key, on) => {
          const ui = optionUI[key];
          if (!ui) return;
          if (on) selected.add(key);
          else selected.delete(key);
          ui.circle.classList.toggle("checked", on);
          ui.bar.style.width = on ? "100%" : "0%";
        };

        for (const opt of step.options) {
          if (opt.decline) {
            const divider = document.createElement("div");
            divider.className = "poll-divider";
            poll.appendChild(divider);
          }

          const optRow = document.createElement("div");
          optRow.className = opt.decline ? "poll-option poll-option-decline" : "poll-option";

          const top = document.createElement("div");
          top.className = "poll-option-top";
          const circle = document.createElement("span");
          circle.className = "poll-circle";
          const label = document.createElement("span");
          label.className = "poll-label";
          label.textContent = opt.label;
          top.append(circle, label);

          const detail = document.createElement("div");
          detail.className = "poll-detail";
          detail.textContent = opt.detail || "";

          const barTrack = document.createElement("div");
          barTrack.className = "poll-bar-track";
          const bar = document.createElement("div");
          bar.className = "poll-bar-fill";
          barTrack.appendChild(bar);

          optRow.append(top, detail, barTrack);
          optionUI[opt.key] = { circle, bar };
          optRow.onclick = () => {
            const turningOn = !selected.has(opt.key);
            // "Can't make it" and picking actual events are mutually
            // exclusive — choosing one clears the other side.
            if (turningOn && opt.decline) {
              for (const o of step.options) if (!o.decline) setChecked(o.key, false);
            } else if (turningOn && !opt.decline) {
              setChecked("none", false);
            }
            setChecked(opt.key, turningOn);
            continueBtn.classList.toggle("ready", selected.size > 0);
          };
          poll.appendChild(optRow);
        }

        const footer = document.createElement("div");
        footer.className = "poll-footer";
        footer.textContent = timeNow();
        poll.appendChild(footer);

        row.appendChild(poll);
        this.log.appendChild(row);
        this.scrollToBottom();

        const continueBtn = document.createElement("button");
        continueBtn.type = "button";
        continueBtn.className = "wa-send-btn poll-continue";
        continueBtn.textContent = "Continue";
        continueBtn.onclick = () => {
          if (selected.size === 0) return;
          poll.classList.add("locked");
          pencil.style.display = "";
          this.clearControls();
          for (const opt of step.options) {
            this.answers[`attend_${opt.key}`] = selected.has(opt.key) ? YES : NO;
          }
          this.answers[step.id] = true; // marks the poll itself as answered
          this.syncDeclineState();
          if (!confirmedOnce) {
            confirmedOnce = true;
            this.stepIndex++;
            resolve();
            this.run();
          } else {
            this.afterEdit();
          }
        };

        pencil.onclick = () => {
          poll.classList.remove("locked");
          poll.scrollIntoView({ behavior: "smooth", block: "center" });
          this.awaitingStepId = step.id;
          this.clearControls();
          this.controls.appendChild(continueBtn);
        };

        this.clearControls();
        this.controls.appendChild(continueBtn);
      }, 500 + Math.random() * 350);
    });
  }

  buildChoiceControl(step, onAnswer) {
    const wrap = document.createElement("div");
    wrap.className = "wa-choices";
    for (const opt of step.options) {
      const btn = document.createElement("button");
      btn.className = "wa-choice-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.onclick = () => onAnswer(opt);
      wrap.appendChild(btn);
    }
    return wrap;
  }

  buildTextControl(step, prefill, onAnswer) {
    const wrap = document.createElement("div");
    wrap.className = "wa-composer";

    const pill = document.createElement("div");
    pill.className = "wa-input-pill";
    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = "🙂";
    emoji.setAttribute("aria-hidden", "true");

    const input = document.createElement("input");
    input.placeholder = step.placeholder || "Message";
    if (step.inputmode) input.inputMode = step.inputmode;
    if (prefill) input.value = prefill;

    pill.appendChild(emoji);
    pill.appendChild(input);

    const send = document.createElement("button");
    send.type = "button";
    send.className = "wa-send-btn";
    send.textContent = "➤";

    const isValid = () => {
      const v = input.value.trim();
      if (step.numeric) return v.replace(/\D/g, "").length >= 7;
      if (step.count) return /^\d+$/.test(v) && Number(v) <= MAX_GUESTS;
      return v.length > 1;
    };

    const refresh = () => send.classList.toggle("ready", isValid());
    input.addEventListener("input", refresh);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    refresh();

    const submit = () => {
      if (!isValid()) return;
      onAnswer(input.value.trim());
    };
    send.onclick = submit;

    wrap.appendChild(pill);
    wrap.appendChild(send);
    setTimeout(() => input.focus(), 300);
    return wrap;
  }

  // Tapping ✏️ on a past answer opens (or closes) an inline editor for it,
  // right under that bubble — the rest of the conversation stays put.
  toggleEditor(step) {
    const entry = this.rows[step.id];
    if (!entry) return;

    if (this.openEditId && this.openEditId !== step.id) {
      this.rows[this.openEditId].editSlot.innerHTML = "";
    }

    if (this.openEditId === step.id) {
      entry.editSlot.innerHTML = "";
      this.openEditId = null;
      return;
    }

    entry.row.scrollIntoView({ behavior: "smooth", block: "center" });
    this.openEditId = step.id;
    entry.editSlot.innerHTML = "";

    const save = (value) => {
      entry.textNode.textContent = value;
      this.recordAnswer(step, value);
      entry.editSlot.innerHTML = "";
      this.openEditId = null;
      this.afterEdit();
    };

    const control =
      step.type === "choice"
        ? this.buildChoiceControl(step, save)
        : this.buildTextControl(step, this.answers[step.id] || "", save);
    entry.editSlot.appendChild(control);
    entry.editSlot.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async finish() {
    this.awaitingStepId = null;
    this.clearControls();
    this.setTyping(true);
    try {
      await this.submitPayload();
      this.finished = true;
      this.setTyping(false);
      const firstName = (this.answers.name || "").trim().split(/\s+/)[0] || "friend";
      if (this.declinedAll) {
        await this.botSay("We're really sorry you can't make it! We will miss you ❤️");
      } else {
        await this.botSay(`That's everything, ${firstName}! 🎉`);
        await this.botSay(
          "You're officially on the list. We cannot WAIT to celebrate with you ❤️",
        );
      }
    } catch (e) {
      this.setTyping(false);
      await this.botSay("Hmm, that didn't send — mind trying once more?");
      this.clearControls();
      const wrap = document.createElement("div");
      wrap.className = "wa-choices";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wa-choice-btn";
      btn.textContent = "Try again";
      btn.onclick = () => {
        this.clearControls();
        this.finish();
      };
      wrap.appendChild(btn);
      this.controls.appendChild(wrap);
    }
  }

  async submitPayload() {
    // Demo build: nothing is persisted anywhere. This just mimics the
    // network delay a real submit would have.
    await sleep(400);
  }

  // A guest can still tap ✏️ after seeing the confirmation screen; quietly
  // re-send the corrected answers without disturbing that screen.
  resubmitSilently() {
    this.submitPayload().catch((e) => console.warn("resubmit failed:", e));
  }

  // Editing a past answer can make previously-skipped questions relevant
  // again — e.g. declining every event skips "will you have guests", but
  // if they later edit the poll to say they're attending after all, that
  // question (and whatever it unlocks) needs to actually get asked, not
  // just silently folded into a resubmit. Finds the earliest still-unanswered
  // step and, if it's somewhere we've already passed, rewinds there and lets
  // the conversation continue forward naturally — including reaching "done"
  // again with the now-correct closing message.
  resumeIfIncomplete() {
    const pendingIdx = this.steps.findIndex((s) => {
      if (!s.id) return false;
      return this.answers[s.id] === undefined;
    });
    if (pendingIdx === -1) return false;
    const pending = this.steps[pendingIdx];
    // If the main flow is genuinely mid-question on this exact step right
    // now, leave it alone — don't interrupt live input. This is tracked
    // explicitly (not inferred from stepIndex/array position) because
    // inserting/removing steps elsewhere can shift array indices out from
    // under stepIndex without anything actually still being shown there.
    if (this.awaitingStepId === pending.id) return false;
    this.stepIndex = pendingIdx;
    this.finished = false;
    this.clearControls();
    this.run();
    return true;
  }

  // Call after any edit is saved: resume the flow if that edit reopened
  // questions that still need answering, otherwise just quietly resubmit
  // if the guest had already reached the confirmation screen.
  afterEdit() {
    if (this.resumeIfIncomplete()) return;
    if (this.finished) this.resubmitSilently();
  }
}

function makeTimeSpan() {
  const span = document.createElement("span");
  span.className = "time";
  span.textContent = timeNow();
  return span;
}

function boot() {
  const root = document.getElementById("app");
  const path = decodeURIComponent(location.pathname.replace(/^\/+/, ""));
  // Demo build: any real slug still works, but the bare root path (how this
  // demo is actually shared) defaults to the full "all events" flow.
  const code = path || "demo";
  const guestType = SLUGS[code] || "all";
  new ChatApp(root, code, guestType);
}

boot();
