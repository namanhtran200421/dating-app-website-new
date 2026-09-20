import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { articles } from './article-catalog';

@Component({
  selector: 'app-blog-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './blog.html',
  styleUrls: ['../../../generated/icons/pages-blog.css', '../story-pages.css', './blog.css'],
})
export class BlogPage {
  protected readonly articles = articles;
}
