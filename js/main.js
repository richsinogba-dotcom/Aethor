/* ==========================================================================
   AETHER — JS
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------- Cursor ----------
  const cursor = $("#cursor");
  const setupCursor = () => {
    if (window.matchMedia("(hover:none),(pointer:coarse)").matches) { cursor.style.display = "none"; return; }
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");
    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("a,button,[data-hover]");
      cursor.classList.toggle("is-hover", !!t);
    });
    document.addEventListener("mousedown", () => cursor.classList.add("is-click"));
    document.addEventListener("mouseup", () => cursor.classList.remove("is-click"));
  };
  setupCursor();

  // ---------- Clock ----------
  const clock = $("#clock");
  const tickClock = () => {
    const d = new Date();
    clock.textContent =
      String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0") + ":" +
      String(d.getSeconds()).padStart(2, "0");
  };
  tickClock(); setInterval(tickClock, 1000);

  // ---------- Preloader ----------
  const preloader = $("#preloader");
  const preloaderFill = $("#preloaderFill");
  const preloaderCount = $("#preloaderCount");
  const runPreloader = () =>
    new Promise((resolve) => {
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 12 + 4;
        if (p >= 100) {
          p = 100;
          preloaderFill.style.width = "100%";
          preloaderCount.textContent = "100";
          clearInterval(interval);
          setTimeout(() => {
            preloader.classList.add("is-done");
            resolve();
          }, 520);
        } else {
          preloaderFill.style.width = p + "%";
          preloaderCount.textContent = String(Math.floor(p)).padStart(2, "0");
        }
      }, 50);
    });

  // ---------- Lenis smooth scroll ----------
  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: "vertical",
    smoothWheel: true,
    touchMultiplier: 1.4,
  });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  // sync gsap with lenis
  lenis.on("scroll", () => ScrollTrigger.update());

  // ---------- GSAP setup ----------
  gsap.registerPlugin(ScrollTrigger);

  // ---------- Reveal on scroll (IntersectionObserver based, works w/ lenis) ----------
  const revealEls = $$("[data-reveal]");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  // ---------- Counter stat animation ----------
  const statNums = $$("[data-count]");
  const io2 = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        const target = parseInt(el.dataset.count, 10);
        const dur = 1800;
        const start = performance.now();
        const run = (now) => {
          const t = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(eased * target)).padStart(2, "0");
          if (t < 1) requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
        io2.unobserve(el);
      }
    },
    { threshold: 0.4 }
  );
  statNums.forEach((e) => io2.observe(e));

  // ---------- Hero parallax layers ----------
  const heroLayers = $$(".hero__layer");
  const initHeroParallax = () => {
    heroLayers.forEach((layer, i) => {
      const depth = parseFloat(layer.dataset.depth || (0.05 + i * 0.08));
      const img = layer.querySelector("img");
      gsap.to(layer, {
        yPercent: depth * -60, // will be scaled by scroll
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      if (img) {
        gsap.to(img, {
          scale: 1.15 + depth * 0.6,
          yPercent: depth * 15,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    });
    // hero title depth fade
    gsap.to(".hero__content", {
      yPercent: -15, opacity: 0, scale: 0.96,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    gsap.to(".hero__rail", {
      y: -40, opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
  };

  // ---------- Scrolly pinned section ----------
  const initScrolly = () => {
    const pin = $("#scrollyPin");
    if (!pin) return;
    const layers = pin.querySelectorAll(".layer");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: "top top",
        end: "+=220%",
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      },
    });

    // Each layer moves/parallaxes at different rates while the whole scene cross-fades
    layers.forEach((layer, i) => {
      const depth = parseFloat(layer.getAttribute("data-depth")) || 0.2;
      // subtle zoom + vertical drift
      tl.fromTo(
        layer,
        { yPercent: 8, scale: 1.05 },
        { yPercent: -15 - depth * 40, scale: 1 + depth * 0.3, ease: "none", duration: 1 },
        0
      );
      // inner image
      const img = layer.querySelector("img");
      if (img) {
        tl.fromTo(img, { scale: 1.25 }, { scale: 1.05 + i * 0.03, ease: "none", duration: 1 }, 0);
      }
    });

    // Caption words stagger in
    const words = pin.querySelectorAll(".scrolly__word");
    tl.fromTo(words, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.12, duration: 0.5, ease: "power3.out" }, 0.1);
    tl.fromTo(".scrolly__text", { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.4);
  };

  // ---------- Horizontal scroll pinned ----------
  const initHorizontal = () => {
    const pin = $("#hscrollPin");
    const track = $("#hscrollTrack");
    if (!pin || !track) return;

    const calculate = () => {
      const trackW = track.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(track).paddingLeft || 0) * 2;
      return -trackW;
    };

    const hTween = gsap.to(track, {
      x: () => calculate(),
      ease: "none",
      scrollTrigger: {
        trigger: pin,
        start: "top top",
        end: () => `+=${track.scrollWidth - window.innerWidth}`,
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    // parallax on individual cards inside (subtle)
    $$(".card__media img").forEach((img) => {
      gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: "none", scrollTrigger: {
        trigger: img, containerAnimation: hTween,
        start: "left right", end: "right left", scrub: true,
      }});
    });
  };

  // ---------- Quote parallax ----------
  const initQuote = () => {
    const bg = $(".quote__bg");
    if (!bg) return;
    gsap.to(bg, {
      yPercent: 25, scale: 1.05,
      ease: "none",
      scrollTrigger: {
        trigger: ".quote",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
    gsap.from(".quote__text p", {
      yPercent: 15, opacity: 0, scale: 0.96,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".quote",
        start: "top 70%",
        end: "top 30%",
        scrub: 1,
      },
    });
  };

  // ---------- Work rows stagger reveal ----------
  const initWork = () => {
    const rows = $$(".work__row");
    gsap.from(rows, {
      x: -40, opacity: 0, stagger: 0.1, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".work", start: "top 70%", toggleActions: "play none none none" },
    });
  };

  // ---------- Intro big text letter/word reveal ----------
  const initIntro = () => {
    gsap.from("#introBig", {
      yPercent: 30, opacity: 0, duration: 1.4, ease: "power3.out",
      scrollTrigger: { trigger: "#story", start: "top 75%" },
    });
  };

  // ---------- Hero text intro ----------
  const initHeroText = () => {
    const lines = $$(".hero__title .line__inner");
    gsap.fromTo(lines,
      { yPercent: 120 },
      { yPercent: 0, duration: 1.3, stagger: 0.12, ease: "power4.out", delay: 0.2 }
    );
    gsap.from(".hero__eyebrow", { opacity: 0, y: 20, duration: .9, delay: .6, ease: "power3.out" });
    gsap.from(".hero__meta > *", { opacity: 0, y: 30, duration: .9, stagger: .12, delay: 1.0, ease: "power3.out" });
  };

  // ---------- Contact title reveal ----------
  const initContact = () => {
    const lines = $$("#contactBig .line__inner");
    gsap.fromTo(lines,
      { yPercent: 120 },
      { yPercent: 0, duration: 1.2, stagger: 0.14, ease: "power4.out",
        scrollTrigger: { trigger: "#contact", start: "top 75%" } }
    );
  };

  // ---------- Nav hide/show on scroll direction ----------
  let lastScroll = 0;
  const nav = $("#nav");
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > lastScroll && y > 140) nav.classList.add("nav--hide");
    else nav.classList.remove("nav--hide");
    lastScroll = y;
  }, { passive: true });

  // ---------- Nav shrink on scroll ----------
  const handleNavStyle = () => {
    if (window.scrollY > 40) nav.classList.add("nav--compact");
    else nav.classList.remove("nav--compact");
  };
  window.addEventListener("scroll", handleNavStyle, { passive: true });

  // ---------- Mobile menu ----------
  const burger = $("#burger");
  const menu = $("#menu");
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", (!open).toString());
    menu.classList.toggle("is-open", !open);
    document.body.style.overflow = !open ? "hidden" : "";
    if (!open) lenis.stop(); else lenis.start();
  });
  // close on link click
  $$("a", menu).forEach((a) => a.addEventListener("click", () => {
    burger.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
    document.body.style.overflow = "";
    lenis.start();
  }));

  // ---------- Smooth scroll on anchor clicks (lenis) ----------
  $$("a[href^='#']").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.6, offset: -90 });
    });
  });

  // ---------- Nav active link based on scroll ----------
  const navLinks = $$(".nav__links a");
  const sections = ["#story", "#craft", "#work", "#contact"];
  const spy = () => {
    const y = window.scrollY + window.innerHeight / 2;
    let active = -1;
    sections.forEach((sel, i) => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (el.offsetTop <= y) active = i;
    });
    navLinks.forEach((l, i) => l.classList.toggle("is-active", i === active));
  };
  window.addEventListener("scroll", spy, { passive: true });

  // ---------- Progress bar ----------
  const progress = $("#progressBar");
  const updateProgress = () => {
    const sc = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = Math.min(100, (sc / max) * 100);
    progress.style.width = p + "%";
  };
  lenis.on("scroll", updateProgress);

  // ---------- Marquee seamless fix: duplicate track content ----------
  const m1 = $("#marquee1");
  if (m1 && !m1.dataset.duped) {
    m1.innerHTML = m1.innerHTML + m1.innerHTML;
    m1.dataset.duped = "1";
  }
  const bandTrack = $(".band__track");
  if (bandTrack && !bandTrack.dataset.duped) {
    bandTrack.innerHTML = bandTrack.innerHTML + bandTrack.innerHTML;
    bandTrack.dataset.duped = "1";
  }

  // ---------- Magnetic effect on hover targets ----------
  $$("[data-hover]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.16;
      const y = (e.clientY - r.top - r.height / 2) * 0.16;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });

  // ---------- Init all on preloader done ----------
  runPreloader().then(() => {
    document.body.classList.add("is-ready");
    initHeroText();
    initHeroParallax();
    initScrolly();
    initHorizontal();
    initQuote();
    initWork();
    initIntro();
    initContact();
    ScrollTrigger.refresh();
  });

  // ---------- Hide nav on scroll CSS hook ----------
  const style = document.createElement("style");
  style.textContent = `
    .nav--hide { transform: translateY(calc(-100% - 20px)); transition: transform .5s cubic-bezier(.6,.05,.2,1); }
    .nav--compact .nav__shell { padding-top: 8px; padding-bottom: 8px; }
    .nav__links a.is-active { color: var(--fg); }
    .nav__links a.is-active span { transform: translateY(-100%); }
  `;
  document.head.appendChild(style);
})();
