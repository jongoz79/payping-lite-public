
// Client-side interactions: Copy JSON and Filtering
function copyParserJson(id, btnElement) {
  const scriptElem = document.getElementById('parser-json-' + id);
  if (!scriptElem) return;
  const text = scriptElem.textContent.trim();
  copyText(text, btnElement);
}

function copyText(text, btnElement) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(showSuccess).catch(fallback);
  } else {
    fallback();
  }

  function fallback() {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showSuccess();
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  function showSuccess() {
    showToast("Parser JSON copied to clipboard");
    if (btnElement) {
      const origHtml = btnElement.getAttribute('data-orig-html') || btnElement.innerHTML;
      btnElement.setAttribute('data-orig-html', origHtml);
      btnElement.innerHTML = '<svg class="icon icon-check" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg> Copied!';
      setTimeout(() => {
        btnElement.innerHTML = origHtml;
      }, 2000);
    }
  }
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg> ' + msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Search and filter logic
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.parser-card');

  if (!searchInput && filterBtns.length === 0) return;

  let currentFilter = 'all';

  function filterCards() {
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    cards.forEach(card => {
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const packages = (card.getAttribute('data-packages') || '').toLowerCase();
      const tested = card.getAttribute('data-tested') === 'true';

      let matchesFilter = true;
      if (currentFilter === 'tested' && !tested) matchesFilter = false;
      if (currentFilter === 'untested' && tested) matchesFilter = false;

      let matchesSearch = true;
      if (query.length > 0) {
        matchesSearch = name.includes(query) || packages.includes(query);
      }

      if (matchesFilter && matchesSearch) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterCards);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      filterCards();
    });
  });
});
