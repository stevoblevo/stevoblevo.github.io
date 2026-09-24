(() => {
  // src/lib/stare.ts
  var HOLD = 1100;
  function mountStare(canvas2, opts) {
    const gl = canvas2.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance"
    });
    if (!gl) {
      opts.onLine("The stare couldn't start.");
      return () => {
      };
    }
    const program = link(gl);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const uTex = gl.getUniformLocation(program, "u");
    const uCover = gl.getUniformLocation(program, "uCover");
    const uMode = gl.getUniformLocation(program, "uMode");
    const uCenter = gl.getUniformLocation(program, "uCenter");
    const uRadius = gl.getUniformLocation(program, "uRadius");
    const uRing = gl.getUniformLocation(program, "uRing");
    const uBlink = gl.getUniformLocation(program, "uBlink");
    let ringTex = null;
    let faceTex = null;
    let wellTex = null;
    let ringSize = { w: 1, h: 1 };
    let wellSize = { w: 1, h: 1 };
    let view = { w: 1, h: 1, dpr: 1 };
    let holding = false;
    let holdStart = 0;
    let hits = 0;
    let done = false;
    let raf = 0;
    let alive = true;
    const faceAt = () => {
      const r = Math.min(view.h * 0.17, 140);
      return { x: view.w * 0.5, y: view.h * 0.42, r };
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view = { w: canvas2.clientWidth || window.innerWidth, h: canvas2.clientHeight || window.innerHeight, dpr };
      canvas2.width = Math.max(1, Math.floor(view.w * dpr));
      canvas2.height = Math.max(1, Math.floor(view.h * dpr));
      gl.viewport(0, 0, canvas2.width, canvas2.height);
    };
    const inside = (x, y) => {
      const f = faceAt();
      const dx = x - f.x;
      const dy = y - f.y;
      return dx * dx + dy * dy <= f.r * f.r;
    };
    const pointer = (e) => {
      const rect = canvas2.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const down = (e) => {
      if (done) return;
      const p = pointer(e);
      if (!inside(p.x, p.y)) return;
      holding = true;
      holdStart = performance.now();
      canvas2.setPointerCapture(e.pointerId);
    };
    const move = (e) => {
      if (!holding || done) return;
      const p = pointer(e);
      if (!inside(p.x, p.y)) {
        holding = false;
        opts.onLine("She looks away. Come back to her eyes.");
      }
    };
    const up = () => {
      if (!holding || done) return;
      holding = false;
      if (performance.now() - holdStart < HOLD) opts.onLine("Not yet. Stay with her.");
    };
    canvas2.addEventListener("pointerdown", down);
    canvas2.addEventListener("pointermove", move);
    canvas2.addEventListener("pointerup", up);
    canvas2.addEventListener("pointercancel", up);
    window.addEventListener("resize", resize);
    resize();
    opts.onLine("Hold her eyes.");
    const draw = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (holding && !done && now - holdStart >= HOLD) {
        hits += 1;
        holding = false;
        if (hits >= 3) {
          done = true;
          opts.onLine("She isn't angry at the well. The fight stayed on the porch.");
        } else {
          opts.onLine(hits === 1 ? "She holds." : "She holds again.");
        }
      }
      const bg = done && wellTex ? wellTex : ringTex;
      const size = done ? wellSize : ringSize;
      if (!bg) return;
      const cover = coverOf(size.w, size.h, view.w, view.h);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uCover, cover[0], cover[1]);
      gl.uniform1i(uTex, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bg);
      gl.uniform1f(uMode, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!done && faceTex) {
        const f = faceAt();
        const blink = 0.72 + 0.28 * Math.abs(Math.sin(now * 17e-4));
        gl.uniform1f(uMode, 1);
        gl.uniform1f(uBlink, blink);
        gl.uniform2f(uCenter, f.x * view.dpr, (view.h - f.y) * view.dpr);
        gl.uniform1f(uRadius, f.r * view.dpr);
        gl.bindTexture(gl.TEXTURE_2D, faceTex);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const t = holding ? Math.min(1, (now - holdStart) / HOLD) : 0;
        gl.uniform1f(uMode, 2);
        gl.uniform1f(uRing, 1.85 - t * 0.85);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };
    Promise.all([load(opts.ring), load(opts.face), load(opts.well)]).then(([ring, face, well]) => {
      if (!alive) return;
      ringTex = makeTex(gl, ring);
      faceTex = makeTex(gl, face);
      wellTex = makeTex(gl, well);
      ringSize = { w: ring.width, h: ring.height };
      wellSize = { w: well.width, h: well.height };
      raf = requestAnimationFrame(draw);
    });
    return () => {
      var _a;
      alive = false;
      cancelAnimationFrame(raf);
      canvas2.removeEventListener("pointerdown", down);
      canvas2.removeEventListener("pointermove", move);
      canvas2.removeEventListener("pointerup", up);
      canvas2.removeEventListener("pointercancel", up);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      (_a = gl.getExtension("WEBGL_lose_context")) == null ? void 0 : _a.loseContext();
    };
  }
  function coverOf(iw, ih, vw, vh) {
    const ir = iw / ih;
    const vr = vw / vh;
    if (ir > vr) return [vr / ir, 1];
    return [1, ir / vr];
  }
  function load(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(src));
      img.src = src;
    });
  }
  function makeTex(gl, img) {
    const tex = gl.createTexture();
    if (!tex) throw new Error("tex");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  function link(gl) {
    const vert = compile(gl, gl.VERTEX_SHADER, "attribute vec2 a;varying vec2 v;void main(){v=a*0.5+0.5;v.y=1.0-v.y;gl_Position=vec4(a,0.0,1.0);}");
    const frag = compile(
      gl,
      gl.FRAGMENT_SHADER,
      "precision mediump float;varying vec2 v;uniform sampler2D u;uniform vec2 uCover;uniform float uMode;uniform vec2 uCenter;uniform float uRadius;uniform float uRing;uniform float uBlink;void main(){if(uMode<0.5){vec2 uv=(v-0.5)/uCover+0.5;gl_FragColor=texture2D(u,uv);return;}float d=distance(gl_FragCoord.xy,uCenter);if(uMode<1.5){if(d>uRadius) discard;vec2 p=(gl_FragCoord.xy-uCenter)/uRadius;vec2 fuv=vec2(p.x*0.32+0.5,0.22-p.y*0.22);vec4 c=texture2D(u,fuv);float edge=smoothstep(uRadius,uRadius-2.0,d);gl_FragColor=vec4(c.rgb*uBlink,edge);return;}float band=1.0-smoothstep(1.2,3.2,abs(d-uRadius*uRing));gl_FragColor=vec4(1.0,0.96,0.93,band*0.85);}"
    );
    const program = gl.createProgram();
    if (!program) throw new Error("program");
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link");
    return program;
  }
  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "compile");
    return shader;
  }

  // ../tmp/io-entry.ts
  var canvas = document.querySelector("canvas");
  var line = document.querySelector("#line");
  if (canvas && line) {
    mountStare(canvas, {
      ring: "ring.png",
      face: "stare.png",
      well: "well-cry.jpg",
      onLine: (text) => {
        line.textContent = text;
      }
    });
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {
    });
  }
})();
