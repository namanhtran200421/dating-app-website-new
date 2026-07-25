import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

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
    expect(signup.duplicateEmailError()).toBe(false);
    expect(service.calls).toBe(0);
  });

  it('shows the duplicate error when the backend reports an existing email', () => {
    service.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 400,
          error: { message: 'This email has already been registered' },
        }),
    );
    signup.preSignForm.controls.email.setValue('already@rosemarry.test');

    signup.submit();

    expect(signup.emailError()).toBe(false);
    expect(signup.duplicateEmailError()).toBe(true);
  });
});
