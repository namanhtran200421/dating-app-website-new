import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Contacts } from '../model/contactModel';

type ContactRequest = Omit<Contacts, '_id' | 'createdAt'> & {
  turnstileToken: string;
};

interface PreSignupRequest {
  email: string;
  turnstileToken: string;
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
    return this.http.post(`${this.baseUrl}/api/pre-signups`, presignupData);
  }

  addContact(contactData: ContactRequest) {
    return this.http.post(`${this.baseUrl}/api/contact`, contactData);
  }
}
