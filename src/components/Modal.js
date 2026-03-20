function renderModalShell({ overlayClassName, overlayId, dialogClassName, closeButtonClassName, closeButtonId, titleMarkup, bodyMarkup, footerMarkup = '' }) {
  return `
    <div class="${overlayClassName}" id="${overlayId}">
      <div class="${dialogClassName}">
        ${titleMarkup}
        <button class="${closeButtonClassName}" id="${closeButtonId}" type="button">&times;</button>
        ${bodyMarkup}
        ${footerMarkup}
      </div>
    </div>
  `;
}

export function renderEditModalShell() {
  return renderModalShell({
    overlayClassName: 'modal-overlay',
    overlayId: 'edit-modal',
    dialogClassName: 'modal',
    closeButtonClassName: 'close-modal',
    closeButtonId: 'close-edit',
    titleMarkup: '<h3 id="edit-modal-title">Edit Entry</h3>',
    bodyMarkup: '<div id="edit-form-container"></div>',
    footerMarkup: `
      <div class="modal-actions">
        <button class="btn btn-primary" id="save-edit-btn" type="button">Save Changes</button>
        <button class="btn btn-danger" id="delete-edit-btn" type="button">Delete Entry</button>
      </div>
    `,
  });
}

export function renderBookDetailModalShell() {
  return `
    <div class="book-modal-overlay" id="book-detail-modal">
      <div class="book-modal">
        <div class="book-modal-header">
          <h2 id="bm-header-title">Book Details</h2>
          <button class="book-modal-close" id="close-book-modal" type="button">&times;</button>
        </div>
        <div class="book-modal-body">
          <div class="book-modal-cover-col">
            <div class="book-modal-cover-loading" id="bm-cover-wrap">Loading cover...</div>
          </div>
          <div class="book-modal-info">
            <div class="book-modal-title" id="bm-title"></div>
            <div class="book-modal-author" id="bm-author"></div>
            <div class="book-modal-meta" id="bm-meta"></div>
            <div class="book-modal-progress" id="bm-progress"></div>
            <div class="book-modal-desc-title">About this book</div>
            <div class="book-modal-desc loading" id="bm-desc">Fetching description...</div>
            <div class="book-modal-ol-meta" id="bm-ol-meta"></div>
            <div class="book-modal-dates" id="bm-dates"></div>
            <div id="bm-notes"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
