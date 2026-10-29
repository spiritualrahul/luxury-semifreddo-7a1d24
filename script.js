const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const today = new Date();
const isoDate = (date) => date.toISOString().slice(0, 10);
const due = new Date(today);
due.setDate(today.getDate() + 7);

const STORE_KEY = "ignitexInvoiceRecords";
const ACTIVE_KEY = "ignitexActiveInvoiceId";
const LEGACY_KEY = "ignitexInvoiceState";

// Company details are fixed and not editable in the form.
const COMPANY_DETAILS = {
  companyAddress: "Jamshedpur, Jharkhand, India",
  companyGst: "",
  companyEmail: "ignitexsolution@gmail.com",
  companyPhone: "+91 8935860306",
  companyWebsite: "www.ignitexsolution.com",
};

const BANK_DETAILS = {
  bankName: "Jharkhand Gramin Bank (Vananchal Gramin Bank)",
  accountHolder: "IGNITEX SOLUTION",
  accountNumber: "84075492148",
  ifsc: "SBIN0RRVCGB",
  bankBranch: "Rajnagar",
  upi: "ignitexsolution@upi",
};

const DEFAULT_SIGNATURE = "./assets/signature.png";

// Old placeholder bank values that should be replaced by the fixed defaults on saved invoices.
const PLACEHOLDER_BANK = {
  accountHolder: ["IgniteX Solution"],
  accountNumber: ["000000000000", "0000000000"],
  ifsc: ["IFSC0000000", "IFSC000000"],
};

function withBankDefaults(invoice) {
  const next = { ...invoice, ...COMPANY_DETAILS };
  Object.keys(BANK_DETAILS).forEach((key) => {
    const value = next[key];
    if (value === undefined || PLACEHOLDER_BANK[key]?.includes(value)) next[key] = BANK_DETAILS[key];
  });
  if (!next.signatureImage) next.signatureImage = DEFAULT_SIGNATURE;
  return next;
}

const initialState = {
  id: "",
  createdAt: "",
  updatedAt: "",
  ...COMPANY_DETAILS,
  invoiceNumber: `IX-${today.getFullYear()}-001`,
  invoiceDate: isoDate(today),
  dueDate: isoDate(due),
  paymentStatus: "Due",
  clientName: "Rahul Sharma",
  clientCompany: "Growth Labs Pvt. Ltd.",
  clientAddress: "Mumbai, Maharashtra, India",
  clientEmail: "client@example.com",
  clientPhone: "+91 98765 43210",
  clientGst: "",
  discountType: "percent",
  discountValue: 10,
  applyTax: false,
  taxRate: 0,
  advancePaid: 15000,
  notes: "Thank you for choosing IgniteX Solution. We appreciate your trust and look forward to delivering measurable digital growth.",
  signatureImage: DEFAULT_SIGNATURE,
  ...BANK_DETAILS,
  items: [
    {
      title: "Website Development",
      description: "Premium responsive business website design and development.",
      quantity: 1,
      rate: 45000,
    },
    {
      title: "SEO Services",
      description: "Technical SEO, keyword strategy, on-page optimization, and reporting.",
      quantity: 1,
      rate: 18000,
    },
    {
      title: "Social Media Management",
      description: "Content planning, creative direction, posting, and monthly optimization.",
      quantity: 1,
      rate: 22000,
    },
  ],
};

let invoices = [];
let state = loadAppState();

function clone(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `ix-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function invoiceSequence(invoiceNumber) {
  const match = String(invoiceNumber || "").match(/IX-\d{4}-(\d+)/);
  return match ? Number(match[1]) : 0;
}

function nextInvoiceNumber() {
  const maxSequence = invoices.reduce((max, invoice) => Math.max(max, invoiceSequence(invoice.invoiceNumber)), 0);
  return `IX-${today.getFullYear()}-${String(maxSequence + 1).padStart(3, "0")}`;
}

function withMeta(invoice) {
  const now = new Date().toISOString();
  return {
    ...clone(initialState),
    ...invoice,
    id: invoice.id || uid(),
    createdAt: invoice.createdAt || now,
    updatedAt: invoice.updatedAt || now,
  };
}

function blankInvoice() {
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + 7);
  return withMeta({
    invoiceNumber: nextInvoiceNumber(),
    invoiceDate: isoDate(new Date()),
    dueDate: isoDate(nextDue),
    paymentStatus: "Due",
    clientName: "",
    clientCompany: "",
    clientAddress: "",
    clientEmail: "",
    clientPhone: "",
    clientGst: "",
    discountType: "percent",
    discountValue: 0,
    applyTax: false,
    taxRate: 0,
    advancePaid: 0,
    notes: "",
    items: [
      {
        title: "",
        description: "",
        quantity: 1,
        rate: 0,
      },
    ],
  });
}

function loadAppState() {
  try {
    const savedRecords = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    invoices = Array.isArray(savedRecords) ? savedRecords.map((invoice) => withBankDefaults(withMeta(invoice))) : [];

    if (!invoices.length) {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
      const firstInvoice = withBankDefaults(withMeta({
        ...(legacy || initialState),
        invoiceNumber: "IX-2026-001",
      }));
      invoices = [firstInvoice];
      localStorage.setItem(STORE_KEY, JSON.stringify(invoices));
      localStorage.setItem(ACTIVE_KEY, firstInvoice.id);
    }

    const activeId = localStorage.getItem(ACTIVE_KEY);
    const activeInvoice = invoices.find((invoice) => invoice.id === activeId) || invoices[0];
    localStorage.setItem(ACTIVE_KEY, activeInvoice.id);
    return clone(activeInvoice);
  } catch {
    const fallback = withMeta({ ...initialState, invoiceNumber: "IX-2026-001" });
    invoices = [fallback];
    return clone(fallback);
  }
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  const existingIndex = invoices.findIndex((invoice) => invoice.id === state.id);
  if (existingIndex >= 0) {
    invoices[existingIndex] = clone(state);
  } else {
    invoices.unshift(clone(state));
  }
  invoices.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  localStorage.setItem(STORE_KEY, JSON.stringify(invoices));
  localStorage.setItem(ACTIVE_KEY, state.id);
  renderInvoiceSelect();
  showAutosave();
}

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value, fallback = "") {
  byId(id).textContent = value || fallback;
}

function invoiceLabel(invoice) {
  const client = invoice.clientName || invoice.clientCompany || "Untitled draft";
  const status = invoice.paymentStatus || "Due";
  return `${invoice.invoiceNumber} - ${client} (${status})`;
}

function renderInvoiceSelect() {
  const select = byId("invoiceSelect");
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = "";
  invoices.forEach((invoice) => {
    const option = document.createElement("option");
    option.value = invoice.id;
    option.textContent = invoiceLabel(invoice);
    select.appendChild(option);
  });
  select.value = invoices.some((invoice) => invoice.id === state.id) ? state.id : currentValue;
}

function showAutosave(message = "Autosaved") {
  const status = byId("autosaveStatus");
  if (!status) return;
  status.textContent = `${message} - ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fitAmountSize(element, formattedText) {
  element.classList.remove("text-sm-fit", "text-xs-fit");
  if (formattedText.length >= 14) {
    element.classList.add("text-xs-fit");
  } else if (formattedText.length >= 10) {
    element.classList.add("text-sm-fit");
  }
}

function inputValue(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.type === "number") return numberValue(input.value);
  return input.value;
}

function itemAmount(item) {
  return numberValue(item.quantity) * numberValue(item.rate);
}

function totals() {
  const subtotal = state.items.reduce((sum, item) => sum + itemAmount(item), 0);
  const discountRaw = numberValue(state.discountValue);
  const discount = state.discountType === "percent" ? subtotal * (discountRaw / 100) : discountRaw;
  const taxable = Math.max(subtotal - discount, 0);
  const tax = state.applyTax ? taxable * (numberValue(state.taxRate) / 100) : 0;
  const finalTotal = taxable + tax;
  const advance = numberValue(state.advancePaid);
  const dueAmount = Math.max(finalTotal - advance, 0);
  return { subtotal, discount, tax, finalTotal, advance, dueAmount };
}

function renderForm() {
  Object.keys(initialState).forEach((key) => {
    if (key === "items") return;
    const input = byId(key);
    if (!input) return;
    if (input.type === "checkbox") {
      input.checked = Boolean(state[key]);
      return;
    }
    input.value = state[key] ?? "";
  });
  renderItemForm();
}

function renderItemForm() {
  const container = byId("itemsForm");
  container.innerHTML = "";
  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "rounded-2xl border border-line bg-slate-50 p-3";
    row.innerHTML = `
      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-xs font-black uppercase tracking-wide text-slate-400">Service ${index + 1}</p>
        <button type="button" class="remove-item rounded-lg bg-white px-2 py-1 text-xs font-black text-red-500 shadow-sm" data-index="${index}">Remove</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <label class="col-span-2"><span class="label">Service Title</span><input class="field item-input" list="serviceSuggestions" data-index="${index}" data-field="title" value="${escapeAttr(item.title)}" /></label>
        <label class="col-span-2"><span class="label">Description</span><textarea class="field min-h-16 item-input" data-index="${index}" data-field="description">${escapeHtml(item.description)}</textarea></label>
        <label><span class="label">Quantity</span><input class="field item-input" type="number" min="0" data-index="${index}" data-field="quantity" value="${item.quantity}" /></label>
        <label><span class="label">Rate</span><input class="field item-input" type="number" min="0" data-index="${index}" data-field="rate" value="${item.rate}" /></label>
      </div>
      <p class="mt-3 text-right text-sm font-black text-[#343a46]">Amount: <span data-amount-index="${index}">${currency.format(itemAmount(item))}</span></p>
    `;
    container.appendChild(row);
  });
}

function renderPreview() {
  const t = totals();
  toggleText("pCompanyAddress", "pCompanyAddress", state.companyAddress);
  toggleText("pCompanyEmail", "pCompanyEmail", state.companyEmail);
  toggleText("pCompanyPhone", "pCompanyPhone", state.companyPhone);
  byId("pCompanyContactSep").classList.toggle("hidden", !(state.companyEmail && state.companyPhone));
  byId("pCompanyContactWrap").classList.toggle("hidden", !(state.companyEmail || state.companyPhone));
  toggleText("pCompanyWebsite", "pCompanyWebsite", state.companyWebsite);
  toggleText("pCompanyGstWrap", "pCompanyGst", state.companyGst);

  setText("pInvoiceNumber", state.invoiceNumber);
  setText("pInvoiceDate", state.invoiceDate);
  setText("pDueDate", state.dueDate);
  renderStatus();

  ["pClientName", "pClientCompany", "pClientAddress", "pClientEmail", "pClientPhone"].forEach((id) => {
    const key = id.charAt(1).toLowerCase() + id.slice(2);
    toggleText(id, id, state[key]);
  });
  toggleText("pClientGstWrap", "pClientGst", state.clientGst);

  renderPreviewItems();
  const serviceNames = state.items.map((item) => String(item.title || "").trim()).filter(Boolean);
  toggleText("pProjectServices", "pProjectServices", serviceNames.join(", "));
  setText("pSubtotal", currency.format(t.subtotal));
  setText("pDiscount", `- ${currency.format(t.discount)}`);
  byId("pDiscountRow").classList.toggle("hidden", !t.discount);
  setText("pTax", currency.format(t.tax));
  byId("pTaxRow").classList.toggle("hidden", !state.applyTax);
  byId("taxRate").disabled = !state.applyTax;
  byId("taxRate").classList.toggle("opacity-50", !state.applyTax);
  setText("pFinal", currency.format(t.finalTotal));
  setText("pAdvance", `- ${currency.format(t.advance)}`);
  byId("pAdvanceRow").classList.toggle("hidden", !t.advance);
  setText("pDueAmount", currency.format(t.dueAmount));
  fitAmountSize(byId("pDueAmount"), currency.format(t.dueAmount));
  const heroTotalText = currency.format(t.finalTotal);
  const heroDueText = currency.format(t.dueAmount);
  setText("pHeroTotal", heroTotalText);
  fitAmountSize(byId("pHeroTotal"), heroTotalText);
  setText("pHeroDue", heroDueText);
  fitAmountSize(byId("pHeroDue"), heroDueText);

  toggleText("pNotesWrap", "pNotes", state.notes);
  renderSignature();
  const bankFields = { pBankName: "bankName", pAccountHolder: "accountHolder", pAccountNumber: "accountNumber", pIfsc: "ifsc", pBankBranch: "bankBranch", pUpi: "upi" };
  Object.entries(bankFields).forEach(([id, key]) => toggleText(`${id}Wrap`, id, state[key]));
  byId("pBankWrap").classList.toggle("hidden", !Object.values(bankFields).some((key) => state[key]));
}

function renderPreviewItems() {
  const body = byId("pItems");
  body.innerHTML = "";
  state.items.forEach((item) => {
    const row = document.createElement("tr");
    row.className = "align-top";
    row.innerHTML = `
      <td class="px-5 py-4">
        <p class="font-black text-[#343a46]">${escapeHtml(item.title || "Service Title")}</p>
        <p class="mt-1 text-xs leading-5 text-slate-500">${escapeHtml(item.description || "Service description")}</p>
      </td>
      <td class="px-5 py-4 text-sm font-bold text-slate-600">${numberValue(item.quantity)}</td>
      <td class="px-5 py-4 text-sm font-bold text-slate-600">${currency.format(numberValue(item.rate))}</td>
      <td class="px-5 py-4 text-right text-sm font-black text-[#343a46]">${currency.format(itemAmount(item))}</td>
    `;
    body.appendChild(row);
  });
}

function renderStatus() {
  const status = byId("pStatus");
  status.textContent = state.paymentStatus;
  status.className = "mt-4 inline-flex px-3 py-1 text-xs font-black uppercase tracking-wide";
  const styles = {
    Paid: "bg-emerald-50 text-emerald-700",
    Partial: "bg-blue-50 text-blue-700",
    Due: "bg-orange-50 text-ember",
  };
  status.className += ` ${styles[state.paymentStatus] || styles.Due}`;
}

function renderSignature() {
  const signature = byId("pSignature");
  if (!state.signatureImage) {
    signature.removeAttribute("src");
    signature.classList.add("hidden");
    return;
  }
  signature.src = state.signatureImage;
  signature.classList.remove("hidden");
}

function toggleText(wrapperId, textId, value) {
  const wrapper = byId(wrapperId);
  wrapper.classList.toggle("hidden", !String(value ?? "").trim());
  setText(textId, value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll("\n", " ");
}

function sync() {
  saveState();
  renderPreview();
}

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.classList.contains("item-input")) {
    const index = Number(target.dataset.index);
    const field = target.dataset.field;
    state.items[index][field] = ["quantity", "rate"].includes(field) ? numberValue(target.value) : target.value;
    const amount = document.querySelector(`[data-amount-index="${index}"]`);
    if (amount) amount.textContent = currency.format(itemAmount(state.items[index]));
    sync();
    return;
  }
  if (target.id && Object.prototype.hasOwnProperty.call(state, target.id)) {
    state[target.id] = inputValue(target);
    sync();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.id === "signatureUpload") {
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      state.signatureImage = reader.result;
      sync();
    });
    reader.readAsDataURL(file);
    return;
  }
  if (target.id === "invoiceSelect") {
    const selected = invoices.find((invoice) => invoice.id === target.value);
    if (!selected) return;
    state = clone(selected);
    localStorage.setItem(ACTIVE_KEY, state.id);
    renderForm();
    renderPreview();
    showAutosave("Opened");
    return;
  }
  if (target.id && Object.prototype.hasOwnProperty.call(state, target.id)) {
    state[target.id] = inputValue(target);
    sync();
  }
});

document.addEventListener("click", (event) => {
  const remove = event.target.closest(".remove-item");
  if (remove) {
    if (state.items.length === 1) return;
    state.items.splice(Number(remove.dataset.index), 1);
    renderItemForm();
    sync();
  }
});

byId("addItemBtn").addEventListener("click", () => {
  state.items.push({
    title: "Performance Marketing",
    description: "Campaign setup, optimization, and performance reporting.",
    quantity: 1,
    rate: 15000,
  });
  renderItemForm();
  sync();
});

function createNewBill() {
  saveState();
  state = blankInvoice();
  invoices.unshift(clone(state));
  localStorage.setItem(STORE_KEY, JSON.stringify(invoices));
  localStorage.setItem(ACTIVE_KEY, state.id);
  renderInvoiceSelect();
  renderForm();
  renderPreview();
  showAutosave("New draft created");
}

byId("newBillBtn").addEventListener("click", createNewBill);
byId("newBillTopBtn").addEventListener("click", createNewBill);

byId("resetBtn").addEventListener("click", () => {
  const preserved = {
    id: state.id,
    createdAt: state.createdAt,
    invoiceNumber: state.invoiceNumber,
  };
  state = withMeta({
    ...blankInvoice(),
    ...preserved,
    invoiceDate: state.invoiceDate,
    dueDate: state.dueDate,
  });
  renderForm();
  sync();
});

byId("saveBtn").addEventListener("click", () => {
  saveState();
  const btn = byId("saveBtn");
  const original = btn.textContent;
  btn.textContent = "Saved";
  setTimeout(() => (btn.textContent = original), 1200);
});

byId("printBtn").addEventListener("click", () => window.print());

byId("shareBtn").addEventListener("click", async () => {
  const text = `Invoice ${state.invoiceNumber} from IgniteX Solution. Due amount: ${currency.format(totals().dueAmount)}`;
  if (navigator.share) {
    await navigator.share({ title: "IgniteX Solution Invoice", text });
  } else {
    await navigator.clipboard.writeText(text);
    const btn = byId("shareBtn");
    const original = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = original), 1200);
  }
});

byId("pdfBtn").addEventListener("click", () => {
  const element = byId("invoicePreview");
  element.classList.add("pdf-mode");
  const options = {
    margin: 0,
    filename: `${state.invoiceNumber || "IgniteX-Invoice"}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "px", format: [794, 1123], orientation: "portrait" },
  };
  html2pdf()
    .set(options)
    .from(element)
    .save()
    .finally(() => {
      element.classList.remove("pdf-mode");
    });
});

renderInvoiceSelect();
renderForm();
renderPreview();
showAutosave("Ready");
