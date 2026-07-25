import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Contacts } from '../model/contactModel';

type ContactRequest = Omit<Contacts, '_id' | 'createdAt'>;

@Injectable({
  providedIn: 'root',
})
export class PreSignupService {
  private baseUrl: string;

  constructor(private http: HttpClient) {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      this.baseUrl = 'http://localhost:3000';
    } else {
      this.baseUrl = '';
    }
  }

  preSignup(presignupData: { email: string }) {
    return this.http.post(`${this.baseUrl}/api/pre-signups`, presignupData);
  }

  addContact(contactData: ContactRequest) {
    return this.http.post(`${this.baseUrl}/api/contact`, contactData);
  }
}
