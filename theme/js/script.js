document.addEventListener('DOMContentLoaded', function () {
  var i18n = window.SITE_I18N || {};

  document.querySelectorAll('.post-content pre').forEach(function (pre) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = i18n.copy || 'copy';
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code') || pre;
      var text = code.innerText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showCopied, showCopied);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        showCopied();
      }
      function showCopied() {
        btn.textContent = i18n.copied || 'copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = i18n.copy || 'copy';
          btn.classList.remove('copied');
        }, 1500);
      }
    });
    pre.appendChild(btn);
  });

  document.querySelectorAll('.post-content table').forEach(function (table) {
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  initSearch();
});

function initSearch() {
  var i18n = window.SITE_I18N || {};
  var toggle = document.getElementById('search-toggle');
  var overlay = document.getElementById('search-overlay');
  var input = document.getElementById('search-input');
  var closeBtn = document.getElementById('search-close');
  var resultsEl = document.getElementById('search-results');
  if (!toggle || !overlay || !input) return;

  var pagefind = null;
  var pagefindPromise = null;

  function loadPagefind() {
    if (!pagefindPromise) {
      resultsEl.innerHTML = '<p class="search-loading">' + escapeHtml(i18n.loading || 'loading...') + '</p>';
      pagefindPromise = import('/pagefind/pagefind.js')
        .then(function (mod) { return mod.init().then(function () { return mod; }); })
        .then(function (mod) {
          pagefind = mod;
          resultsEl.innerHTML = '';
          return mod;
        })
        .catch(function (err) {
          resultsEl.innerHTML = '<p class="search-empty">' + escapeHtml(i18n.unavailable || 'Search unavailable.') + '</p>';
          console.error('Pagefind failed to load', err);
        });
    }
    return pagefindPromise;
  }

  function openSearch() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    loadPagefind();
    setTimeout(function () { input.focus(); }, 0);
  }

  function closeSearch() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    toggle.focus();
  }

  toggle.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeSearch();
  });
  document.addEventListener('keydown', function (e) {
    var activeTag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
    if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && !overlay.hidden) {
      closeSearch();
    }
  });

  var debounceTimer;
  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var query = input.value.trim();
    if (!query) {
      resultsEl.innerHTML = '';
      return;
    }
    debounceTimer = setTimeout(function () { runSearch(query); }, 120);
  });

  function runSearch(query) {
    loadPagefind().then(function (mod) {
      if (!mod) return null;
      return mod.search(query).then(function (search) {
        return Promise.all(search.results.slice(0, 8).map(function (r) { return r.data(); }));
      });
    }).then(function (dataList) {
      if (dataList) renderResults(dataList, query);
    });
  }

  function renderResults(dataList, query) {
    if (!dataList.length) {
      var noResults = i18n.noResultsFor || 'No results for';
      resultsEl.innerHTML = '<p class="search-empty">' + escapeHtml(noResults) + ' "' + escapeHtml(query) + '".</p>';
      return;
    }
    resultsEl.innerHTML = dataList.map(function (d) {
      var title = (d.meta && d.meta.title) || d.url;
      return '<a class="search-result" href="' + d.url + '">' +
        '<span class="title">' + escapeHtml(title) + '</span>' +
        '<span class="excerpt">' + d.excerpt + '</span>' +
        '</a>';
    }).join('');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
