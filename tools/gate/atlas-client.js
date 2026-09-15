/* Offline, dependency-free view. Repository-authored text only enters textContent. */
(() => {
  "use strict";
  const data = JSON.parse(document.getElementById("atlas-data").textContent);
  const model = data.model;
  const $ = id => document.getElementById(id);
  const labels = { unmapped: "未接入", unreviewed: "未复核", aligned: "内容对齐", "spec-changed": "规格变化", "code-changed": "实现变化", "both-changed": "规格与实现均变化", missing: "路径或映射缺失", invalid: "记录有误" };
  const drift = id => data.drift.rows.find(r => r.feature === id);
  let selected = "";
  let selectedReq = "";
  let selectedPath = "";
  let selectedOrphan = "";
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const link = (path, label = path) => {
    const a = el("a", label);
    if (data.links.includes(path) && path && !/[\\\x00-\x1f:]/.test(path) && !path.startsWith("/") && !path.split("/").some(p => !p || p === "." || p === ".." || p === ".git")) {
      a.href = data.rootPrefix.split("/").map(encodeURIComponent).join("/") + "/" + path.split("/").map(encodeURIComponent).join("/");
      a.target = "_blank";
      a.rel = "noopener";
    }
    return a;
  };
  const button = (title, sub, active, action, className = "") => {
    const b = el("button", undefined, "node " + className);
    b.type = "button";
    b.setAttribute("aria-pressed", String(active));
    b.setAttribute("data-focus-key", title);
    b.append(el("strong", title), el("span", sub));
    b.addEventListener("click", () => {
      action();
      // Rendering replaces the nodes; keep keyboard focus on the replacement.
      const replacement = [...document.querySelectorAll("button[data-focus-key]")].find(node => node.getAttribute("data-focus-key") === title);
      replacement?.focus({ preventScroll: true });
    });
    return b;
  };
  const card = (title, owner, content, full = false) => {
    const c = el("section", undefined, "detail-card" + (full ? " full" : ""));
    c.append(el("span", owner, "owner"), el("h3", title), el("pre", content || "未单独记录；不从其他文字猜造。"));
    return c;
  };
  const filtered = () => {
    const query = $("search").value.trim().toLowerCase();
    const state = $("state").value;
    return model.features.filter(f => {
      const status = drift(f.id)?.state || "unmapped";
      const matchState = state === "all" || (state === "review" ? !["aligned", "unmapped"].includes(status) : state === status);
      const searchable = [f.id, f.title, f.technical, ...f.reqs, ...f.reqs.map(id => model.requirements.find(r => r.id === id)?.title || ""), ...f.implementation.map(r => r.path), ...f.related.map(r => r.path)].join(" ").toLowerCase();
      return matchState && (!query || searchable.includes(query));
    });
  };
  function drawEdges() {
    const svg = $("edges");
    svg.replaceChildren();
    const focus = $("features").querySelector('[aria-pressed="true"]');
    if (!focus || !svg.getBoundingClientRect().width) return;
    const area = $("graph").getBoundingClientRect();
    const box = focus.getBoundingClientRect();
    const center = box.top + box.height / 2;
    const list = $("features").getBoundingClientRect();
    if (center < list.top || center > list.bottom) return;
    const point = (x, y) => [x - area.left, y - area.top];
    for (const side of ["requirements", "files"]) {
      const bounds = $(side).getBoundingClientRect();
      for (const node of $(side).querySelectorAll("button")) {
        const r = node.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (mid < bounds.top || mid > bounds.bottom) continue;
        const start = side === "requirements" ? point(r.right, mid) : point(box.right, center);
        const end = side === "requirements" ? point(box.left, center) : point(r.left, mid);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const bend = (start[0] + end[0]) / 2;
        path.setAttribute("d", "M" + start.join(",") + " C" + bend + "," + start[1] + " " + bend + "," + end[1] + " " + end.join(","));
        if (node.classList.contains("related")) path.setAttribute("class", "related");
        svg.append(path);
      }
    }
  }
  function renderDetail(feature) {
    const detail = $("detail");
    detail.replaceChildren();
    if (!feature) return;
    const row = drift(feature.id);
    const heading = el("div", undefined, "detail-head");
    heading.append(el("h2", feature.title), link(feature.plan, "查看源计划 ↗"));
    detail.append(heading);
    if (selectedPath) {
      const owners = model.features.filter(f => f.implementation.some(r => r.path === selectedPath));
      const references = model.features.filter(f => f.related.some(r => r.path === selectedPath));
      const box = el("div", undefined, "path-detail");
      box.append(link(selectedPath), el("p", "实现归属：" + (owners.map(f => f.id).join("、") || "无") + "；相关引用：" + (references.map(f => f.id).join("、") || "无")));
      detail.append(box);
    }
    const review = el("div", undefined, "review-box");
    review.append(el("strong", "内容复核 · " + (labels[row?.state] || "未知")));
    if (row?.changed.length) review.append(el("p", "变化文件：" + row.changed.join("、")));
    if (row?.notes.length) review.append(el("p", row.notes.join("\n")));
    if (row?.previous) {
      review.append(el("p", "上次复核：" + row.previous.at + " · " + row.previous.actor), el("p", row.previous.reason), link(row.previous.evidence.path, "复核引用的证据 ↗"));
    } else review.append(el("p", "尚无明确复核记录。先核对承诺、实现与实际证据，不用一次说明文件编辑代替复核。"));
    review.append(el("p", "复核不等于需求批准、测试执行或用户验收。"));
    detail.append(review);
    const grid = el("div", undefined, "detail-grid");
    grid.append(card("本版需求的原始意图", "USER SOURCE / 非本功能专属", model.layers.raw), card("本版需求的工作解释", "AGENT INTERPRETATION / 非用户批准", model.layers.explanation));
    if (feature.layers.raw || feature.layers.explanation) {
      grid.append(card("本功能的意图引用", "SOURCE REFERENCE", feature.layers.raw), card("本功能的工作解释", "AGENT INTERPRETATION", feature.layers.explanation));
    }
    grid.append(card("技术实现", "IMPLEMENTATION / 选定方案", feature.technical, true));
    const ids = selectedReq ? feature.reqs.filter(id => id === selectedReq) : feature.reqs;
    for (const id of ids) {
      const req = model.requirements.find(r => r.id === id);
      if (!req) continue;
      const c = card(req.title, "REQUIREMENT / 验收承诺", req.text, true);
      c.append(link(req.source, "查看源需求 ↗"));
      const trace = data.trace.find(t => t.req === id);
      if (trace) {
        c.append(el("p", "静态映射：" + trace.mappedAc.length + " 项；需另核验 manual：" + (trace.manualAc.join(", ") || "无") + "；proxy：" + (trace.proxyAc.map(p => "AC-" + p.ac + " " + p.note).join("；") || "无") + "；未映射：" + (trace.uncoveredAc.join(", ") || "无")));
        const files = el("div", undefined, "links");
        for (const file of trace.tests) files.append(link(file));
        c.append(files);
      }
      grid.append(c);
    }
    const legacy = [model.layers.legacy, feature.layers.legacy].filter(Boolean).join("\n\n");
    if (legacy) {
      const wrapper = el("details", undefined, "detail-card full");
      wrapper.append(el("summary", "旧格式正文（未分层；不猜造用户来源）"), el("pre", legacy));
      grid.append(wrapper);
    }
    if (feature.drafts.length) {
      const c = card("较新的草稿", "DRAFT / 不替代绑定计划", "本页认领范围仍使用绑定计划。", true);
      feature.drafts.forEach(path => c.append(link(path)));
      grid.append(c);
    }
    detail.append(grid);
  }
  function render() {
    const features = filtered();
    const query = $("search").value.trim().toLowerCase();
    const orphans = model.requirements.filter(r => !model.features.some(f => f.reqs.includes(r.id)) &&
      ["all", "unmapped"].includes($("state").value) && (!query || (r.id + " " + r.title).toLowerCase().includes(query)));
    if (!orphans.some(r => r.id === selectedOrphan)) selectedOrphan = "";
    if (!features.length && orphans.length && !selectedOrphan) selectedOrphan = orphans[0].id;
    if (selectedOrphan) selected = "";
    else if (!features.some(f => f.id === selected)) {
      selected = features.find(f => f.implementation.length)?.id || features[0]?.id || "";
      selectedReq = ""; selectedPath = "";
    }
    const orphanList = $("unmapped-requirements");
    orphanList.replaceChildren();
    if (orphans.length) {
      orphanList.append(el("h2", "尚未映射到功能的需求"), el("p", "这些承诺尚未被任何当前功能计划引用；不据此推断是否已实现。", "hint"));
      for (const req of orphans) orphanList.append(button(req.title, "未映射 · 查看需求", req.id === selectedOrphan, () => {
        selectedOrphan = req.id; selectedReq = ""; selectedPath = ""; render();
      }));
    }
    $("requirements").replaceChildren(); $("features").replaceChildren(); $("files").replaceChildren();
    $("results").textContent = features.length + " / " + model.features.length + " 个功能 · " + orphans.length + " 条未映射需求 · " + data.drift.needsReview + " 待复核 · " + data.drift.unmapped + " 未接入";
    for (const feature of features) {
      const b = button(feature.id + " · " + feature.title.replace(/^F\d+\s*/, ""), labels[drift(feature.id)?.state] || "未知", feature.id === selected, () => {
        selected = feature.id; selectedOrphan = ""; selectedReq = ""; selectedPath = ""; location.hash = encodeURIComponent(feature.id); render();
      });
      $("features").append(b);
    }
    const feature = features.find(f => f.id === selected);
    const orphan = orphans.find(r => r.id === selectedOrphan);
    if (orphan) {
      $("requirements").append(el("p", orphan.title, "node"));
      $("files").append(el("p", "尚无功能计划与实现映射。", "empty"));
      const c = card(orphan.title, "UNMAPPED REQUIREMENT / 未映射，不是已验收", orphan.text, true);
      c.append(link(orphan.source, "查看源需求 ↗"));
      $("detail").replaceChildren(c);
      drawEdges(); return;
    }
    if (!feature) {
      $("results").textContent = "没有匹配的功能；可调整搜索或状态。";
      $("detail").replaceChildren(el("p", "没有匹配结果。", "empty"));
      drawEdges(); return;
    }
    for (const id of feature.reqs) {
      const req = model.requirements.find(r => r.id === id);
      $("requirements").append(button(id, req?.title.replace(/^REQ-\d+\s*/, "") || "需求缺失", id === selectedReq, () => {
        selectedReq = selectedReq === id ? "" : id; selectedPath = ""; render();
      }));
    }
    for (const [kind, files] of [["implementation", feature.implementation], ["related", feature.related]]) {
      for (const file of files) {
        const b = button(file.path, (kind === "implementation" ? "实现归属" : "相关引用") + (file.problem ? " · " + file.problem : ""), file.path === selectedPath, () => {
          selectedPath = selectedPath === file.path ? "" : file.path; selectedReq = ""; render();
        }, kind === "related" ? "related" : "");
        $("files").append(b);
      }
    }
    if (!feature.implementation.length) $("files").prepend(el("p", "未声明实现映射，不代表没有实现或没有漂移。", "empty"));
    renderDetail(feature);
    requestAnimationFrame(() => {
      const active = $("features").querySelector('[aria-pressed="true"]');
      if (active) {
        const list = $("features"), r = active.getBoundingClientRect(), box = list.getBoundingClientRect();
        if (r.top < box.top || r.bottom > box.bottom) list.scrollTop += r.top - box.top - 8;
      }
      drawEdges();
    });
  }
  $("snapshot").textContent = "只读快照 · " + data.generatedAt + " · 内容树 " + (data.codeTree.hash.slice(0, 12) || "不可用") + " · HEAD " + (data.commit.slice(0, 12) || "无") + (data.codeTree.dirty ? " · 含未提交代码" : "");
  $("evidence").textContent = data.evidence.note;
  const problems = [...data.drift.problems, ...data.drift.rows.filter(r => !model.features.some(f => f.id === r.feature)).map(r => r.feature + ": " + r.notes.join("; "))];
  $("problems").textContent = problems.join("\n") || "未发现来源结构问题；这不是语义正确性判断。";
  $("search").addEventListener("input", render);
  $("state").addEventListener("change", render);
  $("reset").addEventListener("click", () => { $("search").value = ""; $("state").value = "all"; selected = ""; selectedReq = ""; selectedPath = ""; selectedOrphan = ""; location.hash = ""; render(); });
  for (const id of ["requirements", "features", "files"]) $(id).addEventListener("scroll", drawEdges);
  window.addEventListener("resize", drawEdges);
  const fragmentFeature = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ""; } };
  window.addEventListener("hashchange", () => { const id = fragmentFeature(); if (id !== selected && model.features.some(f => f.id === id)) { selected = id; selectedOrphan = ""; selectedReq = ""; selectedPath = ""; render(); } });
  selected = fragmentFeature();
  render();
})();
