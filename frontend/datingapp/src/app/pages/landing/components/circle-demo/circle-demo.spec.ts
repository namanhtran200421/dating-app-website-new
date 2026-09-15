import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircleDemo } from './circle-demo';

describe('CircleDemo', () => {
  let fixture: ComponentFixture<CircleDemo>;
  let element: HTMLElement;

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CircleDemo] }).compileComponents();
    fixture = TestBed.createComponent(CircleDemo);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => vi.useRealTimers());

  it('opens the group chat from the Circle card and clears the unread badge', async () => {
    expect(element.querySelector('.circle-chat__badge')?.textContent).toContain('3 new');
    expect(element.querySelector('.circle-activity')?.textContent).toContain('Flirty prompt');

    element.querySelector<HTMLButtonElement>('.circle-chat')!.click();
    await render();
    expect(element.querySelector('.chat-log')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('.demo-back')!.click();
    await render();
    expect(element.querySelector('.circle-chat__badge')).toBeNull();
  });

  it('asks the page to jump to the activities step from the Flirty prompt card', () => {
    let played = 0;
    fixture.componentInstance.playActivity.subscribe(() => played++);

    element.querySelector<HTMLButtonElement>('.circle-activity')!.click();
    expect(played).toBe(1);
  });

  it('sends a message and gets a reply from a Circle member', async () => {
    vi.useFakeTimers();
    element.querySelector<HTMLButtonElement>('.circle-chat')!.click();
    await render();

    const input = element.querySelector<HTMLInputElement>('#circle-demo-draft')!;
    const send = element.querySelector<HTMLButtonElement>('.chat-send')!;
    expect(send.disabled).toBe(true);

    input.value = 'Hi everyone!';
    input.dispatchEvent(new Event('input'));
    await render();
    send.click();
    await render();

    expect(element.querySelector('.chat-msg--me')?.textContent).toContain('Hi everyone!');
    expect(input.value).toBe('');

    vi.advanceTimersByTime(700);
    await render();
    expect(element.querySelector('.chat-msg--typing')?.textContent).toContain('Liam is typing');

    vi.advanceTimersByTime(1400);
    await render();
    expect(element.querySelector('.chat-msg--typing')).toBeNull();
    expect(element.querySelector('.chat-log li:last-child')?.textContent).toContain(
      'I like you already',
    );
  });
});
