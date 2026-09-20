import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';

interface CircleMember {
  name: string;
  avatar: string;
  color: string;
}

interface ChatMessage {
  id: number;
  kind: 'member' | 'me' | 'event';
  text: string;
  member?: CircleMember;
}

const SOPHIA: CircleMember = {
  name: 'Sophia',
  avatar: '/images/placeholders/profile-1.svg',
  color: '#c41843',
};
const LIAM: CircleMember = {
  name: 'Liam',
  avatar: '/images/placeholders/profile-2.svg',
  color: '#a35800',
};
const MAYA: CircleMember = {
  name: 'Maya',
  avatar: '/images/placeholders/profile-3.svg',
  color: '#0b7a5a',
};
const NOAH: CircleMember = {
  name: 'Noah',
  avatar: '/images/placeholders/profile-4.svg',
  color: '#5b3fd0',
};

// Placeholder replies until the demo is wired to anything real; they cycle in order.
const REPLIES: ReadonlyArray<[CircleMember, string]> = [
  [LIAM, 'Haha okay, I like you already 😂'],
  [MAYA, 'Wait, same!! 🙌'],
  [NOAH, 'Hot take, but I agree'],
  [SOPHIA, "Who's up for trivia later? 🧠"],
  [LIAM, 'Noted 👀'],
  [MAYA, "This Circle is too good, I don't want it to reset"],
  [NOAH, 'Okay, tell us more'],
  [SOPHIA, 'Love that for you 💫'],
];

/** Step 2 of "How it works": the weekly Circle card and a group chat that talks back. */
@Component({
  selector: 'app-circle-demo',
  templateUrl: './circle-demo.html',
  styleUrls: [
    '../../../../../generated/icons/pages-landing-components-circle-demo.css',
    '../demo-card.css',
    './circle-demo.css',
  ],
})
export class CircleDemo {
  private readonly injector = inject(Injector);
  private readonly messageLog = viewChild<ElementRef<HTMLElement>>('messageLog');
  private readonly draftInput = viewChild<ElementRef<HTMLInputElement>>('draftInput');
  private readonly openChatButton = viewChild<ElementRef<HTMLButtonElement>>('openChatButton');
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  /** Fired from the Flirty prompt card; the page scrolls to the activities step. */
  readonly playActivity = output<void>();

  protected readonly days = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly avatars = [SOPHIA, LIAM, MAYA, NOAH];
  private readonly replyDelayMs = { typing: 600, reply: 1400 };

  protected readonly screen = signal<'circle' | 'chat'>('circle');
  protected readonly returned = signal(false);
  protected readonly unread = signal(3);
  protected readonly draft = signal('');
  protected readonly typing = signal<CircleMember | null>(null);
  // Enough history to scroll back through for a few seconds.
  protected readonly messages = signal<readonly ChatMessage[]>(
    (
      [
        ['event', 'Day 6 · Last day of this Circle'],
        [LIAM, "Morning Owls ☀️ who's actually awake?"],
        [MAYA, 'Barely. Coffee first ☕'],
        [NOAH, 'Been up since 6, already went for a run 🏃'],
        [SOPHIA, 'Noah you are a machine'],
        [LIAM, 'Okay, who is doing trivia tonight?'],
        [MAYA, 'Me! I got destroyed on geography last time though 😭'],
        [NOAH, 'Same, I genuinely thought Canberra was made up'],
        [SOPHIA, 'LOL Noah'],
        [MAYA, 'Also that riverside picnic spot rec was so good'],
        [LIAM, 'Told you 😎 best sunset in town'],
        ['event', 'Maya completed "Flirty prompt"'],
        [
          MAYA,
          "What's something small someone could do that would instantly make you like them more?",
        ],
        [SOPHIA, 'Send me a song that reminded them of me 🎶'],
        [NOAH, 'Actually be on time 😅'],
        [LIAM, 'Noah calling us all out 😂'],
        [SOPHIA, "Last day already! This Circle's been a good one 💫"],
      ] as const
    ).map(
      ([from, text], id): ChatMessage =>
        from === 'event' ? { id, kind: 'event', text } : { id, kind: 'member', member: from, text },
    ),
  );

  /** The latest chat lines, previewed on the Circle card (CSS shows two, or four on phones). */
  protected readonly recent = computed(() =>
    this.messages()
      .filter((message) => message.kind !== 'event')
      .slice(-4),
  );

  private nextId = this.messages().length;
  private replyIndex = 0;
  private queuedReplies = 0;
  private replying = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach(clearTimeout));
  }

  protected openChat(): void {
    this.screen.set('chat');
    this.unread.set(0);
    afterNextRender(
      () => {
        this.scrollToBottom('instant');
        // Skip focusing the input on touch screens so the keyboard doesn't pop up uninvited.
        if (matchMedia('(hover: hover)').matches) {
          this.draftInput()?.nativeElement.focus({ preventScroll: true });
        }
      },
      { injector: this.injector },
    );
  }

  protected closeChat(): void {
    this.returned.set(true);
    this.screen.set('circle');
    afterNextRender(() => this.openChatButton()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    });
  }

  protected send(event: Event): void {
    event.preventDefault();
    const text = this.draft().trim();
    if (!text) return;

    this.addMessage({ kind: 'me', text });
    this.draft.set('');
    this.queuedReplies++;
    if (!this.replying) this.replyNext();
  }

  /** Replies play one at a time, so rapid messages never overlap typing indicators. */
  private replyNext(): void {
    if (this.queuedReplies === 0) {
      this.replying = false;
      return;
    }
    this.queuedReplies--;
    this.replying = true;

    const [member, text] = REPLIES[this.replyIndex++ % REPLIES.length];
    this.later(this.replyDelayMs.typing, () => {
      this.typing.set(member);
      this.scrollToBottom();
    });
    this.later(this.replyDelayMs.typing + this.replyDelayMs.reply, () => {
      this.typing.set(null);
      this.addMessage({ kind: 'member', member, text });
      if (this.screen() === 'circle') this.unread.update((count) => count + 1);
      this.replyNext();
    });
  }

  private addMessage(message: Omit<ChatMessage, 'id'>): void {
    this.messages.update((messages) => [...messages, { ...message, id: this.nextId++ }]);
    this.scrollToBottom();
  }

  /** Scrolls only the message log, never the page. */
  private scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    afterNextRender(
      () => {
        const log = this.messageLog()?.nativeElement;
        log?.scrollTo({ top: log.scrollHeight, behavior });
      },
      { injector: this.injector },
    );
  }

  private later(delay: number, run: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, delay);
    this.timers.add(timer);
  }
}
