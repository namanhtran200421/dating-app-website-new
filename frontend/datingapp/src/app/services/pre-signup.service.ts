import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

interface ContactRequest {
  email: string;
  firstName: string;
  lastName: string;
  message: string;
  subject: string;
  turnstileToken: string;
}

interface PreSignupRequest {
  email: string;
  turnstileToken: string;
}

export interface PreSignupResponse {
  message: string;
  status?: 'already-listed' | 'verification-sent';
  success: boolean;
}

interface SubscriptionTokenRequest {
  token: string;
}

interface SubscriptionActionResponse {
  receiptSent?: boolean;
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PreSignupService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    const hostname = isPlatformBrowser(this.platformId) ? window.location.hostname : '';

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      this.baseUrl = 'http://localhost:3000';
    } else {
      this.baseUrl = 'https://rosemarry-api.onrender.com';
    }
  }

  preSignup(presignupData: PreSignupRequest) {
    return this.http.post<PreSignupResponse>(`${this.baseUrl}/api/pre-signups`, presignupData);
  }

  resendVerification(presignupData: PreSignupRequest) {
    return this.http.post(`${this.baseUrl}/api/pre-signups/resend`, presignupData);
  }

  confirmVerification(token: string) {
    const body: SubscriptionTokenRequest = { token };
    return this.http.post<SubscriptionActionResponse>(
      `${this.baseUrl}/api/pre-signups/verify`,
      body,
    );
  }

  unsubscribe(token: string) {
    const body: SubscriptionTokenRequest = { token };
    return this.http.post<SubscriptionActionResponse>(
      `${this.baseUrl}/api/pre-signups/unsubscribe`,
      body,
    );
  }

  addContact(contactData: ContactRequest) {
    return this.http.post(`${this.baseUrl}/api/contact`, contactData);
  }
}
