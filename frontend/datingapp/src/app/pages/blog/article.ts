import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { articles, ArticleSummary } from './article-catalog';
import { articleContent } from './article-content';
import { SignupState } from '../landing/signup-state';

@Component({
  selector: 'app-journal-article',
  imports: [RouterLink, DatePipe],
  templateUrl: './article.html',
  styleUrls: ['../story-pages.css', './article.css'],
})
export class ArticlePage {
  private readonly route = inject(ActivatedRoute);
  protected readonly signup = inject(SignupState);
  protected readonly article = toSignal(
    this.route.data.pipe(
      map((data) => {
        const summary = data['article'] as ArticleSummary;
        return { ...summary, ...articleContent[summary.slug] };
      }),
    ),
    { requireSync: true },
  );
  protected readonly articles = articles;
}
