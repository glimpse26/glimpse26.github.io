/* GLIMPSE project page
 * - attaches video sources lazily (the MP4s are 10-25 MB each)
 * - 2-slide carousel for the long-horizon demonstration; slide 2's GIF is only
 *   fetched the first time it is shown
 * - marks any asset that fails to load with its expected path
 */
(function () {
  "use strict";

  /* ---------- lazy videos ---------- */
  var videos = Array.prototype.slice.call(document.querySelectorAll("video[data-src]"));

  // Playback speed comes from data-speed on the <video> (1 = the file's own speed).
  function applySpeed(video) {
    var rate = parseFloat(video.getAttribute("data-speed"));
    video.playbackRate = rate > 0 ? rate : 1;
  }

  function loadVideo(video) {
    if (video.dataset.loaded) return;
    video.dataset.loaded = "1";
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.addEventListener("error", function () { markMissing(video); }, { once: true });
    // Start playback as soon as enough data is buffered (covers browsers that
    // ignore the autoplay attribute when src is attached late).
    video.addEventListener("loadedmetadata", function () { applySpeed(video); });
    video.addEventListener("canplay", function () {
      if (video.paused && !video.dataset.offscreen) play(video);
    }, { once: true });
    video.src = video.getAttribute("data-src");
    video.preload = "auto";
  }

  function play(video) {
    applySpeed(video);
    var p = video.play();
    if (p && typeof p.catch === "function") p.catch(function () { /* autoplay blocked */ });
  }

  // Load + play while on screen, pause when scrolled away (saves CPU/bandwidth).
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          delete video.dataset.offscreen;
          loadVideo(video);
          play(video);
        } else {
          video.dataset.offscreen = "1";
          video.pause();
        }
      });
    }, { rootMargin: "200px 0px", threshold: 0.01 });
    videos.forEach(function (v) { io.observe(v); });
  } else {
    videos.forEach(function (v) { loadVideo(v); play(v); });
  }

  /* ---------- missing-asset placeholder ---------- */
  function markMissing(el) {
    var box = el.closest(".media-box");
    var path = el.getAttribute("data-src") || el.getAttribute("src");
    if (box) {
      box.classList.add("is-missing");
      box.setAttribute("data-missing", "missing\n" + path);
      // keep the box's footprint so the layout does not collapse
      box.style.aspectRatio = (el.getAttribute("width") || 16) + " / " + (el.getAttribute("height") || 9);
    } else {
      var ph = document.createElement("div");
      ph.className = "fig-missing";
      ph.style.aspectRatio = (el.getAttribute("width") || 16) + " / " + (el.getAttribute("height") || 9);
      ph.textContent = "missing\n" + path;
      el.replaceWith(ph);
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll("img"), function (img) {
    img.addEventListener("error", function () { markMissing(img); }, { once: true });
  });

  /* ---------- carousel ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-carousel]"), function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll(".carousel-slide"));
    var dots = Array.prototype.slice.call(root.querySelectorAll(".carousel-dot"));
    var index = 0;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var active = k === index;
        s.hidden = !active;
        s.classList.toggle("is-active", active);
        if (active) {
          var img = s.querySelector("img[data-src]");
          if (img) { img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); }
        }
      });
      dots.forEach(function (d, k) {
        d.classList.toggle("is-active", k === index);
        d.setAttribute("aria-selected", k === index ? "true" : "false");
      });
    }

    root.querySelector(".carousel-prev").addEventListener("click", function () { show(index - 1); });
    root.querySelector(".carousel-next").addEventListener("click", function () { show(index + 1); });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { show(k); }); });

    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { show(index - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { show(index + 1); e.preventDefault(); }
    });
  });
})();
