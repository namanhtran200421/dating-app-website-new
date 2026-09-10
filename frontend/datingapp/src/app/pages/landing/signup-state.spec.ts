import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { MeasurementService } from '../../core/analytics/measurement.service';

import { PreSignupService } from '../../services/pre-signup.service';
import { SignupState } from './signup-state';

class PreSignupServiceStub {
  response: Observable<unknown> = of({ success: true });
  calls = 0;

  preSignup(): Observable<unknown> {
    this.calls += 1;
    return this.response;
  }
}

describe('SignupState', () => {
  let signup: SignupState;
  let service: PreSignupServiceStub;
  const track = vi.fn();

  beforeEach(() => {
    track.mockReset();
    TestBed.configureTestingModule({
      providers: [
        SignupState,
        { provide: MeasurementService, useValue: { track } },
        {
          provide: PreSignupService,
          useClass: PreSignupServiceStub,
        },
      ],
    });

    signup = TestBed.inject(SignupState);
    service = TestBed.inject(PreSignupService) as unknown as PreSignupServiceStub;
  });

  it('shows the local validation error for an invalid email', () => {
    signup.preSignForm.controls.email.setValue('not-an-email');

    signup.submit();

    expect(signup.emailError()).toBe(true);
    expect(service.calls).toBe(0);
  });

  it('counts a conversion only after success and ignores duplicate in-flight submits', () => {
    const response = new Subject<unknown>();
    service.response = response;
    signup.open('article');
    signup.preSignForm.controls.email.setValue('reader@example.com');
    signup.setTurnstileToken('valid-test-token');
    signup.submit();
    signup.submit();
    expect(service.calls).toBe(1);
    expect(track).toHaveBeenCalledWith('signup_start', 'article');
    expect(track).not.toHaveBeenCalledWith('signup_success', 'article');
    response.next({ success: true });
    response.complete();
    signup.submit();
    expect(service.calls).toBe(1);
    expect(signup.submitted()).toBe(true);
    expect(track).toHaveBeenCalledWith('signup_success', 'article');
    expect(track.mock.calls.filter(([event]) => event === 'signup_success')).toHaveLength(1);
  });
});
