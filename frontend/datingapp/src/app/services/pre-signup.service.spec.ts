import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PreSignupService } from './pre-signup.service';

describe('PreSignupService', () => {
  let service: PreSignupService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PreSignupService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should post contact form values to the backend contact route', () => {
    const contact = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      subject: 'General question',
      message: 'Hello',
      turnstileToken: 'valid-test-token',
    };

    service.addContact(contact).subscribe();

    const request = httpTesting.expectOne('http://localhost:3000/api/contact');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(contact);
    expect(request.request.withCredentials).toBe(false);
    request.flush({ success: true });
  });

  it('posts signup, resend, verification, and unsubscribe requests without credentials', () => {
    service.preSignup({ email: 'reader@example.com', turnstileToken: 'turnstile' }).subscribe();
    service
      .resendVerification({ email: 'reader@example.com', turnstileToken: 'turnstile' })
      .subscribe();
    service.confirmVerification('verification-token').subscribe();
    service.unsubscribe('unsubscribe-token').subscribe();

    const expected = [
      {
        url: 'http://localhost:3000/api/pre-signups',
        body: { email: 'reader@example.com', turnstileToken: 'turnstile' },
      },
      {
        url: 'http://localhost:3000/api/pre-signups/resend',
        body: { email: 'reader@example.com', turnstileToken: 'turnstile' },
      },
      {
        url: 'http://localhost:3000/api/pre-signups/verify',
        body: { token: 'verification-token' },
      },
      {
        url: 'http://localhost:3000/api/pre-signups/unsubscribe',
        body: { token: 'unsubscribe-token' },
      },
    ];

    for (const item of expected) {
      const request = httpTesting.expectOne(item.url);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(item.body);
      expect(request.request.withCredentials).toBe(false);
      request.flush({ success: true });
    }
  });
});
