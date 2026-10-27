/* The Storeybrook site: start the kit, and keep the look picker in the top bar in step with the page. */
(function () {
  var S = window.Storeybrook; if (!S) return;
  S.init();
  var sel = document.querySelector('[data-site-look]');
  if (sel) {
    sel.value = S.theme.get();
    sel.addEventListener('change', function () { S.theme.set(sel.value); });
    window.addEventListener('sb:theme', function (e) { sel.value = e.detail.theme; });
  }
})();
