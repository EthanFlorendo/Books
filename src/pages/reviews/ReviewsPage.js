import { fetchCoverUrlByTitle } from '../../services/openLibraryService.js';
import { getAppState } from '../../state/appState.js';
import { escapeHtml, formatStarsMarkup } from '../../utils/helpers.js';

const REVIEW_ACCENTS = {
  Ethan: '#79a7ff',
  Ewan: '#8f7cf0',
  Isaac: '#5cb7b3',
  Tony: '#f08a5d',
};

let selectedReviewId = null;

function getReviewAccent(reader) {
  return REVIEW_ACCENTS[reader] || '#8fa8c7';
}

function getReviewSortValue(book) {
  return Date.parse(book.date_finished || book.date_started || book.created_at || '') || 0;
}

function formatReviewPreview(text) {
  return escapeHtml(String(text || '').replace(/\s+/g, ' ').trim());
}

function formatReviewBody(text) {
  return String(text || '')
    .trim()
    .split(/\r?\n\s*\r?\n/g)
    .filter(Boolean)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

function getReviewsFromBooks() {
  const { booksByReader } = getAppState();

  return Object.entries(booksByReader)
    .flatMap(([reader, books]) => books
      .filter(book => String(book.notes || '').trim())
      .map(book => ({
        ...book,
        reviewId: String(book.id),
        reviewer: reader,
        reviewText: String(book.notes || '').trim(),
        accent: getReviewAccent(reader),
      })))
    .sort((a, b) => getReviewSortValue(b) - getReviewSortValue(a));
}

async function resolveReviewCoverUrl(title, author = '') {
  const primaryMatch = await fetchCoverUrlByTitle(title);
  if (primaryMatch) return primaryMatch;

  const fallbackQuery = `${title} ${author}`.trim();
  return fallbackQuery ? fetchCoverUrlByTitle(fallbackQuery) : null;
}

function toLargeCoverUrl(coverUrl) {
  return coverUrl ? coverUrl.replace('-M.jpg', '-L.jpg') : '';
}

function scrollReviewsIntoView() {
  document.getElementById('tab-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openReview(reviewId) {
  selectedReviewId = String(reviewId);
  renderReviewsPage();
  scrollReviewsIntoView();
}

function closeReview() {
  selectedReviewId = null;
  renderReviewsPage();
  scrollReviewsIntoView();
}

function renderReviewCover(review) {
  return `
    <div
      class="review-card-cover review-card-cover-placeholder"
      data-cover-title="${escapeHtml(review.title)}"
      data-cover-author="${escapeHtml(review.author || '')}"
      aria-hidden="true"
    ></div>
  `;
}

function renderReviewCard(review, index) {
  return `
    <article
      class="review-card"
      style="--review-accent: ${escapeHtml(review.accent)}; --review-delay: ${index * 60}ms;"
      data-review-card
      data-review-id="${escapeHtml(review.reviewId)}"
      tabindex="0"
      role="button"
      aria-label="Open full review of ${escapeHtml(review.title)} by ${escapeHtml(review.reviewer)}"
    >
      <div class="review-card-art">
        ${renderReviewCover(review)}
      </div>
      <div class="review-card-body">
        <p class="review-card-title">Review of ${escapeHtml(review.title)} by ${escapeHtml(review.reviewer)}</p>
        <div class="review-card-excerpt">${formatReviewPreview(review.reviewText)}</div>
      </div>
    </article>
  `;
}

function renderEmptyState() {
  return `
    <div class="reviews-empty">
      <h3>No reviews yet</h3>
      <p>Add notes to a book entry and it will appear here automatically.</p>
    </div>
  `;
}

function renderGridView(reviews) {
  return `
    <header class="reviews-header">
      <h2 class="reviews-title">Reviews</h2>
    </header>
    <div id="reviews-grid" class="reviews-grid">
      ${reviews.length ? reviews.map(renderReviewCard).join('') : renderEmptyState()}
    </div>
  `;
}

function renderReviewDetail(review) {
  const bookLine = review.author
    ? `${escapeHtml(review.title)} by ${escapeHtml(review.author)}`
    : escapeHtml(review.title);
  const ratingMarkup = review.rating
    ? `
      <div class="review-detail-rating" aria-label="Rating ${escapeHtml(String(review.rating))} out of 5">
        <span class="review-detail-rating-stars">${formatStarsMarkup(review.rating)}</span>
        <span class="review-detail-rating-score">${escapeHtml(String(review.rating))}/5</span>
      </div>
    `
    : '<div class="review-detail-rating review-detail-rating-empty">No rating</div>';

  return `
    <div class="review-detail-page" style="--review-accent: ${escapeHtml(review.accent)};">
      <section class="review-detail-hero">
        <div
          class="review-detail-hero-media"
          data-detail-cover
          data-cover-title="${escapeHtml(review.title)}"
          data-cover-author="${escapeHtml(review.author || '')}"
          aria-hidden="true"
        ></div>
        <div class="review-detail-hero-overlay"></div>
        <div class="review-detail-topbar">
          <button class="review-detail-back" data-review-back type="button">Back to Reviews</button>
        </div>
        <div class="review-detail-copy">
          <p class="review-detail-kicker">Full Review</p>
          <h2 class="review-detail-heading">${escapeHtml(review.title)}</h2>
          <p class="review-detail-byline">a review by ${escapeHtml(review.reviewer)}</p>
        </div>
      </section>

      <article class="review-detail-content">
        <div class="review-detail-meta">
          <p class="review-detail-bookline">${bookLine}</p>
          ${ratingMarkup}
        </div>
        <div class="review-detail-body">
          ${formatReviewBody(review.reviewText)}
        </div>
      </article>
    </div>
  `;
}

function bindReviewGridEvents(scopeElement) {
  const openReviewFromElement = element => {
    const reviewId = element.dataset.reviewId;
    if (reviewId) {
      openReview(reviewId);
    }
  };

  scopeElement.querySelectorAll('[data-review-card]').forEach(card => {
    card.addEventListener('click', () => {
      openReviewFromElement(card);
    });

    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openReviewFromElement(card);
      }
    });
  });
}

function bindReviewDetailEvents(scopeElement) {
  scopeElement.querySelector('[data-review-back]')?.addEventListener('click', () => {
    closeReview();
  });
}

async function hydrateReviewCardCovers(scopeElement) {
  const placeholders = Array.from(scopeElement.querySelectorAll('.review-card-cover-placeholder[data-cover-title]'));

  await Promise.all(placeholders.map(async placeholder => {
    const title = placeholder.dataset.coverTitle || '';
    const author = placeholder.dataset.coverAuthor || '';
    const coverUrl = await resolveReviewCoverUrl(title, author);
    if (!coverUrl || !placeholder.isConnected) return;

    const image = document.createElement('img');
    image.className = 'review-card-cover';
    image.alt = `Cover of ${title}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => {
      if (!placeholder.isConnected) return;
      placeholder.replaceWith(image);
    });
    image.addEventListener('error', () => {
      if (placeholder.isConnected) {
        placeholder.classList.remove('is-loading');
      }
    });

    placeholder.classList.add('is-loading');
    image.src = coverUrl;
  }));
}

async function hydrateReviewDetailCover(scopeElement) {
  const heroMedia = scopeElement.querySelector('[data-detail-cover]');
  if (!heroMedia) return;

  const title = heroMedia.dataset.coverTitle || '';
  const author = heroMedia.dataset.coverAuthor || '';
  const coverUrl = await resolveReviewCoverUrl(title, author);
  if (!coverUrl || !heroMedia.isConnected) return;

  const image = document.createElement('img');
  image.className = 'review-detail-hero-image';
  image.alt = '';
  image.loading = 'eager';
  image.decoding = 'async';
  image.addEventListener('load', () => {
    if (!heroMedia.isConnected) return;

    heroMedia.innerHTML = '';
    heroMedia.appendChild(image);
    heroMedia.classList.add('has-image');
  });

  image.src = toLargeCoverUrl(coverUrl);
}

export function renderReviewsSection() {
  return `
    <section id="tab-reviews" class="tab-content">
      <div id="reviews-page-root" class="reviews-page"></div>
    </section>
  `;
}

export function renderReviewsPage() {
  const reviewsRoot = document.getElementById('reviews-page-root');
  const reviews = getReviewsFromBooks();

  if (!reviewsRoot) return;

  const selectedReview = reviews.find(review => review.reviewId === selectedReviewId) || null;
  if (selectedReviewId && !selectedReview) {
    selectedReviewId = null;
  }

  reviewsRoot.innerHTML = selectedReview
    ? renderReviewDetail(selectedReview)
    : renderGridView(reviews);

  if (selectedReview) {
    bindReviewDetailEvents(reviewsRoot);
    void hydrateReviewDetailCover(reviewsRoot);
    return;
  }

  bindReviewGridEvents(reviewsRoot);
  void hydrateReviewCardCovers(reviewsRoot);
}
