import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SignupState,
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

  it('submits once and ignores duplicate in-flight submits', () => {
    const response = new Subject<unknown>();
    service.response = response;
    signup.open();
    signup.preSignForm.controls.email.setValue('reader@example.com');
    signup.setTurnstileToken('valid-test-token');
    signup.submit();
    signup.submit();
    expect(service.calls).toBe(1);
    response.next({ success: true });
    response.complete();
    signup.submit();
    expect(service.calls).toBe(1);
    expect(signup.submitted()).toBe(true);
  });
});
