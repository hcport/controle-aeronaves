const STORAGE_KEY = "plannerAeronavesMissoes:v1";
const SUPABASE_URL = "https://jzmepevxctuennrdzoaw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6bWVwZXZ4Y3R1ZW5ucmR6b2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzE5NjIsImV4cCI6MjA5OTU0Nzk2Mn0.qB5lwAl4GWnplNgYG1M7rjMJ8U2_thiVS442z-OXcJc";
const CLOUD_SNAPSHOT_KEY = "planner_snapshot_v1";

const state = {
  aircraft: [],
  missions: [],
  unavailability: [],
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  pendingPdfFile: null,
  pendingImportedMission: null,
  similarMissions: [],
  missionFilter: "planned",
  pendingStatusMissionId: null,
  pendingPdfMergedMission: null,
  pendingSheetSync: null,
  lastSyncBackup: null,
  sheetBindings: [],
  syncHistory: [],
  cloud: {
    client: null,
    session: null,
    user: null,
    snapshotId: "",
    saving: false,
    loading: false,
    initialized: false,
    saveTimer: null,
    lastSavedAt: "",
    lastLoadedAt: "",
  },
  sheetConfig: {
    displayName: "Planejamento de Missões",
    spreadsheetId: "105mcoOMetYrGevBGq3YRWDmROYG3cj1pZZchXlF7sBA",
    sheetName: "MISSÕES",
    range: "A:J",
    referenceYear: 2026,
    accessMode: "csv",
    googleClientId: "",
    autoSyncEnabled: false,
    syncFrequency: "manual",
    dailyBlockingMode: "daily",
    lastSyncedAt: "",
  },
  dashboardDate: toIsoDate(new Date()),
  dashboardReferenceDate: toIsoDate(new Date()),
  expandedDashboardWeeks: {
    current: false,
    next: false,
  },
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  loadData();
  bindEvents();
  renderAll();
});

function bindElements() {
  [
    "calendar",
    "dashboardAircraftAvailability",
    "dashboardAircraftSummary",
    "dashboardCurrentWeekTitle",
    "dashboardNextWeekTitle",
    "dashboardCurrentWeekTimeline",
    "dashboardNextWeekTimeline",
    "dashboardAlertCompact",
    "currentMonthLabel",
    "plannerSummary",
    "missionsTableBody",
    "missionsList",
    "aircraftList",
    "unavailabilityList",
    "aircraftSlots",
    "availableAircraftHint",
    "missionDialog",
    "dialogTitle",
    "dialogBody",
    "dialogActions",
    "reviewDialog",
    "pdfReviewDialog",
    "duplicateDialog",
    "pdfImportStatus",
    "pdfExtractionSummary",
    "duplicateCandidateSelect",
    "existingMissionComparison",
    "importedMissionComparison",
    "duplicateReasons",
    "statusDialog",
    "statusDialogTitle",
    "statusDialogBody",
    "statusDialogActions",
    "sheetSyncDialog",
    "sheetSyncSummary",
    "sheetSyncReview",
    "sheetSyncStatus",
    "sheetSyncHistory",
    "cloudStatus",
    "cloudAuthDialog",
    "toast",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.getElementById("previousMonthButton").addEventListener("click", () => moveMonth(-1));
  document.getElementById("nextMonthButton").addEventListener("click", () => moveMonth(1));
  document.getElementById("newMissionFromPlannerButton").addEventListener("click", () => {
    clearMissionForm();
    openMissionFormDialog();
  });
  document.getElementById("dashboardNewMissionButton").addEventListener("click", () => {
    clearMissionForm();
    openMissionFormDialog();
  });
  document.getElementById("dashboardNewAircraftButton").addEventListener("click", () => {
    clearAircraftForm();
    openAircraftFormDialog();
  });
  document.getElementById("dashboardImportPdfButton").addEventListener("click", () => showView("importView"));
  document.getElementById("dashboardOpenPlannerButton").addEventListener("click", () => showView("plannerView"));
  document.getElementById("dashboardOpenAircraftButton").addEventListener("click", () => showView("aircraftView"));
  document.getElementById("dashboardAircraftAvailability").addEventListener("click", (event) => {
    if (!event.target.closest("button")) showView("aircraftView");
  });
  document.getElementById("dashboardAircraftAvailability").addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showView("aircraftView");
    }
  });
  document.getElementById("dashboardPreviousWeekButton").addEventListener("click", () => moveDashboardWeek(-7));
  document.getElementById("dashboardTodayButton").addEventListener("click", () => {
    state.dashboardReferenceDate = toIsoDate(new Date());
    state.expandedDashboardWeeks.current = false;
    state.expandedDashboardWeeks.next = false;
    renderDashboard();
  });
  document.getElementById("dashboardNextWeekButton").addEventListener("click", () => moveDashboardWeek(7));
  document.getElementById("toggleCurrentWeekLanesButton").addEventListener("click", () => toggleDashboardWeek("current"));
  document.getElementById("toggleNextWeekLanesButton").addEventListener("click", () => toggleDashboardWeek("next"));

  document.getElementById("aircraftForm").addEventListener("submit", saveAircraftFromForm);
  document.getElementById("unavailabilityForm").addEventListener("submit", saveUnavailabilityFromForm);
  document.getElementById("missionForm").addEventListener("submit", saveMissionFromForm);
  document.getElementById("openMissionFormButton").addEventListener("click", () => {
    clearMissionForm();
    openMissionFormDialog();
  });
  document.getElementById("openMissionFormButtonList").addEventListener("click", () => {
    clearMissionForm();
    openMissionFormDialog();
  });
  document.getElementById("openAircraftFormButton").addEventListener("click", () => {
    clearAircraftForm();
    openAircraftFormDialog();
  });
  document.getElementById("openUnavailabilityFormButton").addEventListener("click", () => {
    clearUnavailabilityForm();
    openUnavailabilityFormDialog();
  });
  document.getElementById("closeMissionFormDialogButton").addEventListener("click", () => document.getElementById("missionFormDialog").close());
  document.getElementById("closeAircraftFormDialogButton").addEventListener("click", () => document.getElementById("aircraftFormDialog").close());
  document.getElementById("closeUnavailabilityFormDialogButton").addEventListener("click", () => document.getElementById("unavailabilityFormDialog").close());
  document.getElementById("missionStart").addEventListener("change", syncMissionEndDate);
  document.getElementById("unavailabilityStart").addEventListener("change", syncUnavailabilityEndDate);

  ["missionStart", "missionEnd", "missionFlightType", "missionAircraftCount", "missionRequiresArm", "missionRequiresWinch", "missionRequiresHook"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderAircraftSlots);
  });

  document.getElementById("closeDialogButton").addEventListener("click", () => els.missionDialog.close());
  document.getElementById("closeReviewButton").addEventListener("click", () => els.reviewDialog.close());
  document.getElementById("openTextImportButton").addEventListener("click", () => showView("importView"));
  document.getElementById("parseTextButton").addEventListener("click", parseFreeText);
  document.getElementById("reviewForm").addEventListener("submit", saveReviewMission);
  document.getElementById("pdfImportInput").addEventListener("change", selectPdfFile);
  document.getElementById("processPdfButton").addEventListener("click", processSelectedPdf);
  document.getElementById("closePdfReviewButton").addEventListener("click", cancelPdfImport);
  document.getElementById("pdfReviewForm").addEventListener("submit", reviewImportedMission);
  document.getElementById("pdfStartDate").addEventListener("change", syncPdfEndDate);
  document.getElementById("closeDuplicateButton").addEventListener("click", cancelPdfImport);
  document.getElementById("cancelPdfImportButton").addEventListener("click", cancelPdfImport);
  document.getElementById("savePdfAsNewButton").addEventListener("click", saveImportedAsNew);
  document.getElementById("updateExistingMissionButton").addEventListener("click", updateMissionFromImport);
  document.getElementById("duplicateCandidateSelect").addEventListener("change", renderDuplicateComparison);
  document.getElementById("showCancelledMissions").addEventListener("change", renderCalendar);
  document.getElementById("showDashboardCancelled").addEventListener("change", renderDashboard);
  document.getElementById("closeStatusDialogButton").addEventListener("click", closeStatusDialog);
  document.getElementById("sheetConfigForm").addEventListener("submit", saveSheetConfig);
  document.getElementById("testSheetConnectionButton").addEventListener("click", testSheetConnection);
  document.getElementById("syncSheetNowButton").addEventListener("click", syncGoogleSheetMissions);
  document.getElementById("undoSheetSyncButton").addEventListener("click", undoLastSheetSync);
  document.getElementById("closeSheetSyncDialogButton").addEventListener("click", closeSheetSyncDialog);
  document.getElementById("cancelSheetSyncButton").addEventListener("click", closeSheetSyncDialog);
  document.getElementById("applySheetSyncButton").addEventListener("click", applyMissionSync);
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.missionFilter = button.dataset.missionFilter;
      document.querySelectorAll(".filter-button").forEach((item) => item.classList.toggle("active", item === button));
      renderMissionsList();
    });
  });

  document.querySelectorAll(".soon-button").forEach((button) => {
    button.addEventListener("click", () => showToast("Funcionalidade em desenvolvimento."));
  });

  document.getElementById("exportBackupButton").addEventListener("click", exportBackup);
  document.getElementById("importBackupInput").addEventListener("change", importBackup);
  document.getElementById("cloudLoginButton").addEventListener("click", openCloudAuthDialog);
  document.getElementById("cloudLogoutButton").addEventListener("click", signOutCloud);
  document.getElementById("cloudSyncButton").addEventListener("click", syncCloudNow);
  document.getElementById("closeCloudAuthButton").addEventListener("click", () => els.cloudAuthDialog.close());
  document.getElementById("cloudAuthForm").addEventListener("submit", signInCloudWithEmail);
  document.getElementById("cloudSignupButton").addEventListener("click", signUpCloudWithEmail);
  loadSheetConfigForm();
  initSupabase();
  window.setInterval(refreshDashboardIfDateChanged, 60000);
  window.setInterval(runAutomaticSheetSync, 60000);
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    state.aircraft = Array.isArray(parsed.aircraft) ? parsed.aircraft : [];
    state.missions = Array.isArray(parsed.missions) ? parsed.missions.map(normalizeMission) : [];
    state.unavailability = Array.isArray(parsed.unavailability) ? parsed.unavailability.map(normalizeUnavailability) : [];
    state.sheetConfig = { ...state.sheetConfig, ...(parsed.sheetConfig || {}) };
    state.sheetBindings = Array.isArray(parsed.sheetBindings) ? parsed.sheetBindings : [];
    state.syncHistory = Array.isArray(parsed.syncHistory) ? parsed.syncHistory : [];
  } catch {
    showToast("Não foi possível carregar os dados salvos.");
  }
}

function normalizeMission(mission) {
  const assigned = Array.isArray(mission.aircraftAssigned)
    ? mission.aircraftAssigned
    : Array.isArray(mission.aircraftIds) ? mission.aircraftIds : [];
  const normalizedAssigned = [...new Set(assigned.map((item) => String(item).trim()).filter(Boolean))];
  const rawDailyPlanning = Array.isArray(mission.dailyPlanning) ? mission.dailyPlanning : [];
  const hasHiddenDailyAircraft = rawDailyPlanning.some((day) => Array.isArray(day.aircraftAssigned) && day.aircraftAssigned.length);
  const shouldDropHiddenDailyPlanning = !normalizedAssigned.length && hasHiddenDailyAircraft;
  const rawRequired = Number(mission.aircraftRequired ?? mission.aircraftCount ?? 1);
  const requiredSource = String(mission.aircraftRequiredSource || mission.aircraftQuantitySource || "manual");
  return {
    ...mission,
    status: mission.status === "cancelled" ? "cancelled" : "planned",
    normalizedName: String(mission.normalizedName || normalizeComparableText(mission.name || "")),
    aircraftRequired: Math.max(requiredSource === "not-identified" ? 0 : 1, rawRequired || 0),
    aircraftRequiredSource: requiredSource,
    aircraftQuantitySource: String(mission.aircraftQuantitySource || requiredSource),
    aircraftAssigned: normalizedAssigned,
    aircraftSchedule: shouldDropHiddenDailyPlanning ? [] : (Array.isArray(mission.aircraftSchedule) ? mission.aircraftSchedule : []),
    crewSchedule: shouldDropHiddenDailyPlanning ? [] : (Array.isArray(mission.crewSchedule) ? mission.crewSchedule : []),
    dailyPlanning: shouldDropHiddenDailyPlanning ? [] : rawDailyPlanning,
    scheduleEntries: Array.isArray(mission.scheduleEntries) ? mission.scheduleEntries : [],
    unresolvedRows: Array.isArray(mission.unresolvedRows) ? mission.unresolvedRows : [],
    duplicateAircraftWarnings: Array.isArray(mission.duplicateAircraftWarnings) ? mission.duplicateAircraftWarnings : [],
    flightHoursAvailable: mission.flightHoursAvailable === null ? null : (mission.flightHoursAvailable ?? mission.flightHours ?? ""),
    flightHoursDisplay: String(mission.flightHoursDisplay ?? mission.flightHoursAvailable ?? mission.flightHours ?? ""),
    flightHoursRaw: String(mission.flightHoursRaw ?? mission.flightHoursAvailable ?? mission.flightHours ?? ""),
    sourceDocument: String(mission.sourceDocument || ""),
    reference: String(mission.reference || ""),
    supportedTroop: String(mission.supportedTroop || ""),
    airUnit: String(mission.airUnit || ""),
    aircraftModel: String(mission.aircraftModel || ""),
    operationDetails: Array.isArray(mission.operationDetails) ? mission.operationDetails.filter(Boolean) : [],
    contactName: String(mission.contactName || ""),
    contactRole: String(mission.contactRole || ""),
    contactPhone: String(mission.contactPhone || ""),
    notes: String(mission.notes ?? mission.details ?? ""),
    source: String(mission.source || ""),
    sourceSheetName: String(mission.sourceSheetName || ""),
    sourceRowStart: mission.sourceRowStart || null,
    sourceRowEnd: mission.sourceRowEnd || null,
    sourceMissionKey: String(mission.sourceMissionKey || ""),
    sheetBindingId: String(mission.sheetBindingId || ""),
    lastSyncedAt: String(mission.lastSyncedAt || ""),
    sheetSyncState: String(mission.sheetSyncState || ""),
    locationEntries: Array.isArray(mission.locationEntries) ? mission.locationEntries : [],
    declaredDateRange: mission.declaredDateRange || null,
    tags: Array.isArray(mission.tags) ? mission.tags : [],
    overnights: mission.overnights ?? "",
    overnightSchedule: Array.isArray(mission.overnightSchedule) ? mission.overnightSchedule : [],
    fieldSources: mission.fieldSources || {},
    changeHistory: Array.isArray(mission.changeHistory) ? mission.changeHistory : [],
    importWarnings: Array.isArray(mission.importWarnings) ? mission.importWarnings : [],
    importSource: mission.importSource || null,
    requirements: {
      armament: !!(mission.requirements?.armament ?? mission.requirements?.arm),
      winch: !!mission.requirements?.winch,
      hook: !!mission.requirements?.hook,
      ifr: !!mission.requirements?.ifr,
      ovn: !!mission.requirements?.ovn,
      restrictedArea: !!mission.requirements?.restrictedArea,
      medevac: !!mission.requirements?.medevac,
      paradrop: !!mission.requirements?.paradrop,
      aerialShooting: !!mission.requirements?.aerialShooting,
    },
  };
}

function normalizeUnavailability(item) {
  return {
    id: String(item.id || uid("unavailability")),
    aircraftId: String(item.aircraftId || ""),
    startDate: String(item.startDate || ""),
    endDate: String(item.endDate || item.startDate || ""),
    reason: String(item.reason || "Indisponibilidade"),
    notes: String(item.notes || ""),
    createdAt: String(item.createdAt || new Date().toISOString()),
  };
}

function persist() {
  // Mantem uma copia local para funcionamento offline e envia para a nuvem quando houver login.
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    aircraft: state.aircraft,
    missions: state.missions,
    unavailability: state.unavailability,
    sheetConfig: state.sheetConfig,
    sheetBindings: state.sheetBindings,
    syncHistory: state.syncHistory,
    updatedAt: new Date().toISOString(),
  }));
  scheduleCloudSave();
}

function appSnapshot() {
  return {
    aircraft: state.aircraft,
    missions: state.missions,
    unavailability: state.unavailability,
    sheetConfig: state.sheetConfig,
    sheetBindings: state.sheetBindings,
    syncHistory: state.syncHistory,
    updatedAt: new Date().toISOString(),
  };
}

function applySnapshot(snapshot) {
  state.aircraft = Array.isArray(snapshot.aircraft) ? snapshot.aircraft : [];
  state.missions = Array.isArray(snapshot.missions) ? snapshot.missions.map(normalizeMission) : [];
  state.unavailability = Array.isArray(snapshot.unavailability) ? snapshot.unavailability.map(normalizeUnavailability) : [];
  state.sheetConfig = { ...state.sheetConfig, ...(snapshot.sheetConfig || {}) };
  state.sheetBindings = Array.isArray(snapshot.sheetBindings) ? snapshot.sheetBindings : [];
  state.syncHistory = Array.isArray(snapshot.syncHistory) ? snapshot.syncHistory : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appSnapshot()));
}

async function initSupabase() {
  if (!window.supabase?.createClient) {
    setCloudStatus("Nuvem indisponível: biblioteca não carregada.", "danger");
    return;
  }
  state.cloud.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const { data } = await state.cloud.client.auth.getSession();
  await handleCloudSession(data?.session || null);
  await loadCloudSnapshot({ publicRead: true, silent: true });
  state.cloud.client.auth.onAuthStateChange((_event, session) => {
    handleCloudSession(session);
  });
}

async function handleCloudSession(session) {
  state.cloud.session = session || null;
  state.cloud.user = session?.user || null;
  state.cloud.initialized = true;
  updateCloudControls();
  setCloudStatus(state.cloud.user ? "Nuvem conectada para edição." : "Visualização pública.", state.cloud.user ? "ok" : "muted");
}

function openCloudAuthDialog() {
  document.getElementById("cloudEmail").value = state.cloud.user?.email || "";
  els.cloudAuthDialog.showModal();
}

async function signInCloudWithEmail(event) {
  event.preventDefault();
  if (!state.cloud.client) return showToast("Supabase não carregou neste navegador.");
  const email = document.getElementById("cloudEmail").value.trim();
  const password = document.getElementById("cloudPassword").value;
  if (!email || !password) return showToast("Informe e-mail e senha.");
  setCloudStatus("Entrando na nuvem...", "syncing");
  const { error } = await state.cloud.client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    setCloudStatus("Erro no login da nuvem.", "danger");
    return showToast(error.message || "Não foi possível entrar.");
  }
  els.cloudAuthDialog.close();
  showToast("Login realizado.");
}

async function signUpCloudWithEmail() {
  if (!state.cloud.client) return showToast("Supabase não carregou neste navegador.");
  const email = document.getElementById("cloudEmail").value.trim();
  const password = document.getElementById("cloudPassword").value;
  if (!email || !password) return showToast("Informe e-mail e senha.");
  if (password.length < 6) return showToast("A senha precisa ter pelo menos 6 caracteres.");
  setCloudStatus("Criando acesso...", "syncing");
  const { error } = await state.cloud.client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) {
    setCloudStatus("Erro ao criar acesso.", "danger");
    return showToast(error.message || "Não foi possível criar o acesso.");
  }
  els.cloudAuthDialog.close();
  setCloudStatus("Acesso criado. Confirme o e-mail, se solicitado.", "syncing");
  showToast("Acesso criado. Verifique seu e-mail se o Supabase pedir confirmação.");
}

async function signOutCloud() {
  if (!state.cloud.client) return;
  await state.cloud.client.auth.signOut();
  state.cloud.session = null;
  state.cloud.user = null;
  state.cloud.snapshotId = "";
  updateCloudControls();
  setCloudStatus("Nuvem: desconectada.", "muted");
}

async function syncCloudNow() {
  await loadCloudSnapshot({ publicRead: true, notify: true });
}

async function loadCloudSnapshot(options = {}) {
  if (!state.cloud.client || state.cloud.loading) return;
  state.cloud.loading = true;
  setCloudStatus("Carregando dados da nuvem...", "syncing");
  try {
    const { data, error } = await state.cloud.client
      .from("app_settings")
      .select("id,value,updated_at")
      .eq("key", CLOUD_SNAPSHOT_KEY)
      .maybeSingle();
    if (error) throw error;
    if (!data?.value) {
      if (state.cloud.user) {
        await saveCloudSnapshot({ immediate: true });
        setCloudStatus("Nuvem conectada. Dados locais enviados.", "ok");
      } else {
        setCloudStatus("Nuvem sem dados publicados.", "muted");
      }
      return;
    }

    state.cloud.snapshotId = data.id;
    applySnapshot(data.value);
    state.cloud.lastLoadedAt = new Date().toISOString();
    renderAll();
    setCloudStatus(`${state.cloud.user ? "Nuvem conectada" : "Visualização pública"} · atualizada ${formatDateTime(state.cloud.lastLoadedAt)}`, state.cloud.user ? "ok" : "muted");
    if (options.notify) showToast("Dados atualizados da nuvem.");
  } catch (error) {
    setCloudStatus("Erro ao ler a nuvem.", "danger");
    if (!options.silent) showToast(error.message || "Não foi possível carregar dados da nuvem.");
  } finally {
    state.cloud.loading = false;
    updateCloudControls();
  }
}

function scheduleCloudSave() {
  if (!state.cloud.user || state.cloud.loading) return;
  window.clearTimeout(state.cloud.saveTimer);
  state.cloud.saveTimer = window.setTimeout(() => {
    saveCloudSnapshot();
  }, 900);
}

async function saveCloudSnapshot(options = {}) {
  if (!state.cloud.client || !state.cloud.user || state.cloud.saving) return;
  state.cloud.saving = true;
  setCloudStatus("Salvando na nuvem...", "syncing");
  try {
    const snapshot = appSnapshot();
    let error;
    if (state.cloud.snapshotId) {
      ({ error } = await state.cloud.client
        .from("app_settings")
        .update({ value: snapshot, updated_at: new Date().toISOString() })
        .eq("id", state.cloud.snapshotId));
    } else {
      const result = await state.cloud.client
        .from("app_settings")
        .insert({ key: CLOUD_SNAPSHOT_KEY, value: snapshot })
        .select("id")
        .single();
      error = result.error;
      if (result.data?.id) state.cloud.snapshotId = result.data.id;
    }
    if (error) throw error;
    state.cloud.lastSavedAt = new Date().toISOString();
    setCloudStatus(`Nuvem salva · ${formatDateTime(state.cloud.lastSavedAt)}`, "ok");
    if (options.immediate) renderAll();
  } catch (error) {
    setCloudStatus("Erro ao salvar na nuvem.", "danger");
    showToast(error.message || "Não foi possível salvar na nuvem.");
  } finally {
    state.cloud.saving = false;
    updateCloudControls();
  }
}

function updateCloudControls() {
  const logged = !!state.cloud.user;
  document.getElementById("cloudLoginButton").hidden = logged;
  document.getElementById("cloudLogoutButton").hidden = !logged;
  document.getElementById("cloudSyncButton").textContent = "Atualizar";
}

function setCloudStatus(text, tone = "muted") {
  if (!els.cloudStatus) return;
  els.cloudStatus.textContent = text;
  els.cloudStatus.className = `cloud-status cloud-status-${tone}`;
}

function requireCloudEditor(action = "alterar os dados") {
  if (state.cloud.user) return true;
  showToast(`Entre com e-mail autorizado para ${action}.`);
  openCloudAuthDialog();
  return false;
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".tab-button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  if (viewId === "missionsView") renderAircraftSlots();
  if (viewId === "aircraftView") renderUnavailabilityAircraftOptions();
}

function openMissionFormDialog() {
  renderAircraftSlots();
  document.getElementById("missionFormDialog").showModal();
}

function openAircraftFormDialog() {
  document.getElementById("aircraftFormDialog").showModal();
}

function openUnavailabilityFormDialog() {
  renderUnavailabilityAircraftOptions();
  document.getElementById("unavailabilityFormDialog").showModal();
}

function renderAll() {
  renderDashboard();
  renderAircraftList();
  renderUnavailabilityList();
  renderUnavailabilityAircraftOptions();
  renderMissionsList();
  renderMissionsTable();
  renderCalendar();
  renderAircraftSlots();
  renderSheetSyncStatus();
}

function saveAircraftFromForm(event) {
  event.preventDefault();
  if (!requireCloudEditor("salvar aeronaves")) return;
  const id = document.getElementById("aircraftId").value || uid("aircraft");
  const record = {
    id,
    number: document.getElementById("aircraftNumber").value.trim(),
    status: document.getElementById("aircraftStatus").value,
    capabilities: {
      VFR: document.getElementById("aircraftVfr").checked,
      IFR: document.getElementById("aircraftIfr").checked,
      OVN: document.getElementById("aircraftOvn").checked,
      arm: document.getElementById("aircraftArm").checked,
      winch: document.getElementById("aircraftWinch").checked,
      hook: document.getElementById("aircraftHook").checked,
    },
    hdv: document.getElementById("aircraftHdv").value.trim(),
    details: document.getElementById("aircraftDetails").value.trim(),
  };

  if (!record.number) return showToast("Informe o numeral da aeronave.");

  const index = state.aircraft.findIndex((item) => item.id === id);
  if (index >= 0) state.aircraft[index] = record;
  else state.aircraft.push(record);

  persist();
  document.getElementById("aircraftFormDialog").close();
  clearAircraftForm();
  renderAll();
  showToast("Aeronave salva.");
}

function clearAircraftForm() {
  document.getElementById("aircraftForm").reset();
  document.getElementById("aircraftId").value = "";
  document.getElementById("aircraftFormTitle").textContent = "Cadastrar aeronave";
}

function editAircraft(id) {
  const aircraft = state.aircraft.find((item) => item.id === id);
  if (!aircraft) return;
  document.getElementById("aircraftId").value = aircraft.id;
  document.getElementById("aircraftNumber").value = aircraft.number;
  document.getElementById("aircraftStatus").value = aircraft.status;
  document.getElementById("aircraftVfr").checked = !!aircraft.capabilities.VFR;
  document.getElementById("aircraftIfr").checked = !!aircraft.capabilities.IFR;
  document.getElementById("aircraftOvn").checked = !!aircraft.capabilities.OVN;
  document.getElementById("aircraftArm").checked = !!aircraft.capabilities.arm;
  document.getElementById("aircraftWinch").checked = !!aircraft.capabilities.winch;
  document.getElementById("aircraftHook").checked = !!aircraft.capabilities.hook;
  document.getElementById("aircraftHdv").value = aircraft.hdv || "";
  document.getElementById("aircraftDetails").value = aircraft.details || "";
  document.getElementById("aircraftFormTitle").textContent = "Editar aeronave";
  openAircraftFormDialog();
}

function deleteAircraft(id) {
  if (!requireCloudEditor("excluir aeronaves")) return;
  const used = state.missions.some((mission) => mission.aircraftAssigned.includes(id));
  if (used && !confirm("Esta aeronave está prevista em missão. Excluir mesmo assim?")) return;
  state.aircraft = state.aircraft.filter((item) => item.id !== id);
  state.unavailability = state.unavailability.filter((item) => item.aircraftId !== id);
  state.missions = state.missions.map((mission) => ({
    ...mission,
    aircraftAssigned: mission.aircraftAssigned.filter((aircraftId) => aircraftId !== id),
  }));
  persist();
  renderAll();
  showToast("Aeronave excluída.");
}

function renderAircraftList() {
  if (!state.aircraft.length) {
    els.aircraftList.innerHTML = `<p class="muted">Nenhuma aeronave cadastrada.</p>`;
    return;
  }

  els.aircraftList.innerHTML = state.aircraft
    .sort((a, b) => a.number.localeCompare(b.number, "pt-BR", { numeric: true }))
    .map((aircraft) => {
      const basicCapabilities = ["VFR", "IFR", "OVN"].filter((capability) => aircraft.capabilities[capability]);
      const specialCapabilities = Object.entries({
        Braço: aircraft.capabilities.arm,
        Guincho: aircraft.capabilities.winch,
        Gancho: aircraft.capabilities.hook,
      })
        .filter(([, enabled]) => enabled)
        .map(([label]) => `<span class="tag">${label}</span>`)
        .join("");
      return `
        <article class="item-card aircraft-card ${aircraft.status === "down" ? "aircraft-card-down" : "aircraft-card-up"}">
          <div class="item-card-header">
            <div>
              <div class="item-title aircraft-title">${escapeHtml(aircraft.number)} <span>— ${escapeHtml(basicCapabilities.join(" / ") || "sem capacidade de voo")}</span></div>
              <div class="item-meta">HDV: ${escapeHtml(aircraft.hdv || "não informado")}</div>
            </div>
            <span class="status-pill ${aircraft.status === "up" ? "status-up" : "status-down"}">${aircraft.status === "up" ? "Em cima" : "Baixada"}</span>
          </div>
          <div>${specialCapabilities || `<span class="muted">Sem capacidades especiais</span>`}</div>
          ${aircraft.details ? `<div class="item-meta">${escapeHtml(aircraft.details)}</div>` : ""}
          <div class="item-actions">
            <button class="secondary-button" type="button" onclick="editAircraft('${aircraft.id}')">Editar</button>
            <button class="ghost-button" type="button" onclick="deleteAircraft('${aircraft.id}')">Excluir</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderUnavailabilityAircraftOptions() {
  const select = document.getElementById("unavailabilityAircraft");
  if (!select) return;
  const current = select.value;
  const options = state.aircraft
    .slice()
    .sort((a, b) => a.number.localeCompare(b.number, "pt-BR", { numeric: true }))
    .map((aircraft) => `<option value="${aircraft.id}">${escapeHtml(aircraft.number)}${aircraft.status === "down" ? " — Baixada" : ""}</option>`)
    .join("");
  select.innerHTML = options ? `<option value="">Selecione</option>${options}` : `<option value="">Cadastre uma aeronave primeiro</option>`;
  select.value = state.aircraft.some((aircraft) => aircraft.id === current) ? current : "";
}

function saveUnavailabilityFromForm(event) {
  event.preventDefault();
  if (!requireCloudEditor("salvar indisponibilidades")) return;
  const id = document.getElementById("unavailabilityId").value || uid("unavailability");
  const record = normalizeUnavailability({
    id,
    aircraftId: document.getElementById("unavailabilityAircraft").value,
    startDate: document.getElementById("unavailabilityStart").value,
    endDate: document.getElementById("unavailabilityEnd").value,
    reason: document.getElementById("unavailabilityReason").value.trim() || "Indisponibilidade",
    notes: document.getElementById("unavailabilityNotes").value.trim(),
  });

  if (!record.aircraftId) return showToast("Selecione a aeronave.");
  if (!record.startDate || !record.endDate) return showToast("Informe as datas da indisponibilidade.");
  if (record.endDate < record.startDate) return showToast("A data final não pode ser anterior à inicial.");

  const index = state.unavailability.findIndex((item) => item.id === id);
  if (index >= 0) state.unavailability[index] = record;
  else state.unavailability.push(record);

  persist();
  document.getElementById("unavailabilityFormDialog").close();
  clearUnavailabilityForm();
  renderAll();
  showToast("Indisponibilidade salva.");
}

function clearUnavailabilityForm() {
  document.getElementById("unavailabilityForm").reset();
  document.getElementById("unavailabilityId").value = "";
  document.getElementById("unavailabilityEnd").min = "";
  document.getElementById("unavailabilityFormTitle").textContent = "Indisponibilidade temporária";
  renderUnavailabilityAircraftOptions();
}

function syncUnavailabilityEndDate() {
  const startInput = document.getElementById("unavailabilityStart");
  const endInput = document.getElementById("unavailabilityEnd");
  endInput.min = startInput.value;
  if (startInput.value && (!endInput.value || endInput.value < startInput.value)) {
    endInput.value = startInput.value;
  }
}

function editUnavailability(id) {
  const item = state.unavailability.find((record) => record.id === id);
  if (!item) return;
  renderUnavailabilityAircraftOptions();
  document.getElementById("unavailabilityId").value = item.id;
  document.getElementById("unavailabilityAircraft").value = item.aircraftId;
  document.getElementById("unavailabilityStart").value = item.startDate;
  document.getElementById("unavailabilityEnd").value = item.endDate;
  document.getElementById("unavailabilityReason").value = item.reason;
  document.getElementById("unavailabilityNotes").value = item.notes;
  syncUnavailabilityEndDate();
  document.getElementById("unavailabilityFormTitle").textContent = "Editar indisponibilidade";
  openUnavailabilityFormDialog();
}

function deleteUnavailability(id) {
  if (!requireCloudEditor("excluir indisponibilidades")) return;
  if (!confirm("Excluir esta indisponibilidade?")) return;
  state.unavailability = state.unavailability.filter((item) => item.id !== id);
  persist();
  renderAll();
  showToast("Indisponibilidade excluída.");
}

function renderUnavailabilityList() {
  if (!els.unavailabilityList) return;
  if (!state.unavailability.length) {
    els.unavailabilityList.innerHTML = `<p class="muted">Nenhuma indisponibilidade temporária cadastrada.</p>`;
    return;
  }

  els.unavailabilityList.innerHTML = state.unavailability
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || aircraftRefNumber(a.aircraftId).localeCompare(aircraftRefNumber(b.aircraftId), "pt-BR", { numeric: true }))
    .map((item) => `
      <article class="item-card unavailability-card">
        <div class="item-card-header">
          <div>
            <div class="item-title">${escapeHtml(aircraftRefNumber(item.aircraftId) || "Aeronave não encontrada")} — ${escapeHtml(item.reason)}</div>
            <div class="item-meta">${formatDate(item.startDate)} a ${formatDate(item.endDate)}</div>
          </div>
          <span class="status-pill status-down">Indisponível</span>
        </div>
        ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
        <div class="item-actions">
          <button class="secondary-button" type="button" onclick="editUnavailability('${item.id}')">Editar</button>
          <button class="ghost-button" type="button" onclick="deleteUnavailability('${item.id}')">Excluir</button>
        </div>
      </article>
    `)
    .join("");
}

function missionFormData(idOverride) {
  const formId = idOverride || document.getElementById("missionId").value || uid("mission");
  const existing = state.missions.find((mission) => mission.id === formId) || {};
  const selected = [...document.querySelectorAll(".aircraft-select")]
    .map((select) => select.value)
    .filter(Boolean);
  const aircraftPlanChanged = hasMissionAircraftPlanChanged(existing, selected);
  return {
    ...existing,
    id: formId,
    name: document.getElementById("missionName").value.trim(),
    startDate: document.getElementById("missionStart").value,
    endDate: document.getElementById("missionEnd").value,
    location: document.getElementById("missionLocation").value.trim(),
    flightType: document.getElementById("missionFlightType").value,
    aircraftRequired: Math.max(1, Number(document.getElementById("missionAircraftCount").value || 1)),
    requirements: {
      armament: document.getElementById("missionRequiresArm").checked,
      winch: document.getElementById("missionRequiresWinch").checked,
      hook: document.getElementById("missionRequiresHook").checked,
    },
    aircraftAssigned: [...new Set(selected)],
    aircraftSchedule: aircraftPlanChanged ? [] : (existing.aircraftSchedule || []),
    crewSchedule: aircraftPlanChanged ? [] : (existing.crewSchedule || []),
    dailyPlanning: aircraftPlanChanged ? [] : (existing.dailyPlanning || []),
    flightHoursAvailable: document.getElementById("missionFlightHours").value.trim(),
    details: document.getElementById("missionDetails").value.trim(),
    notes: document.getElementById("missionDetails").value.trim(),
  };
}

function hasMissionAircraftPlanChanged(existing, selected) {
  if (!existing?.id) return false;
  const selectedNumbers = selected.map((ref) => aircraftRefNumber(ref)).filter(Boolean).sort();
  const existingNumbers = (existing.aircraftAssigned || []).map((ref) => aircraftRefNumber(ref)).filter(Boolean).sort();
  const selectedKey = selectedNumbers.join("|");
  const existingKey = existingNumbers.join("|");
  const countChanged = Number(document.getElementById("missionAircraftCount").value || 1) !== Number(existing.aircraftRequired || 1);
  const datesChanged = document.getElementById("missionStart").value !== existing.startDate
    || document.getElementById("missionEnd").value !== existing.endDate;
  return selectedKey !== existingKey || countChanged || datesChanged;
}

function saveMissionFromForm(event) {
  event.preventDefault();
  if (!requireCloudEditor("salvar missões")) return;
  const record = missionFormData();
  if (!validateMission(record)) return;
  upsertMission(record);
  document.getElementById("missionFormDialog").close();
  clearMissionForm();
  renderAll();
  showToast("Missão salva.");
}

function validateMission(mission) {
  if (!mission.name) return showToast("Informe o nome da missão.");
  if (!mission.startDate || !mission.endDate) return showToast("Informe as datas da missão.");
  if (mission.endDate < mission.startDate) return showToast("A data final não pode ser anterior à inicial.");
  if (mission.aircraftAssigned.length > mission.aircraftRequired) return showToast("Há mais aeronaves selecionadas que o previsto.");
  return true;
}

function upsertMission(record) {
  const normalized = normalizeMission(record);
  const index = state.missions.findIndex((item) => item.id === normalized.id);
  if (index >= 0) state.missions[index] = normalized;
  else state.missions.push(normalized);
  persist();
}

function clearMissionForm() {
  document.getElementById("missionForm").reset();
  document.getElementById("missionId").value = "";
  document.getElementById("missionAircraftCount").value = "1";
  document.getElementById("missionEnd").min = "";
  document.getElementById("missionFormTitle").textContent = "Cadastrar missão";
  renderAircraftSlots();
}

function syncMissionEndDate() {
  const startInput = document.getElementById("missionStart");
  const endInput = document.getElementById("missionEnd");
  endInput.min = startInput.value;

  // Manter um valor no campo final faz o seletor nativo abrir no mesmo mes e ano.
  if (startInput.value && (!endInput.value || endInput.value < startInput.value)) {
    endInput.value = startInput.value;
  }
}

function editMission(id) {
  const mission = state.missions.find((item) => item.id === id);
  if (!mission) return;
  els.missionDialog.close();
  document.getElementById("missionId").value = mission.id;
  document.getElementById("missionName").value = mission.name;
  document.getElementById("missionStart").value = mission.startDate;
  document.getElementById("missionEnd").value = mission.endDate;
  syncMissionEndDate();
  document.getElementById("missionLocation").value = mission.location || "";
  document.getElementById("missionFlightType").value = mission.flightType;
  document.getElementById("missionAircraftCount").value = mission.aircraftRequired || 1;
  document.getElementById("missionFlightHours").value = mission.flightHoursAvailable || "";
  document.getElementById("missionRequiresArm").checked = !!mission.requirements.armament;
  document.getElementById("missionRequiresWinch").checked = !!mission.requirements.winch;
  document.getElementById("missionRequiresHook").checked = !!mission.requirements.hook;
  document.getElementById("missionDetails").value = mission.details || "";
  document.getElementById("missionFormTitle").textContent = "Editar missão";
  renderAircraftSlots(mission.aircraftAssigned);
  openMissionFormDialog();
}

function deleteMission(id) {
  if (!requireCloudEditor("excluir missões")) return;
  if (!confirm("Excluir esta missão?")) return;
  state.missions = state.missions.filter((item) => item.id !== id);
  persist();
  els.missionDialog.close();
  renderAll();
  showToast("Missão excluída.");
}

function requestCancelMission(id) {
  if (!requireCloudEditor("cancelar missões")) return;
  const mission = state.missions.find((item) => item.id === id);
  if (!mission) return;
  state.pendingStatusMissionId = id;
  els.statusDialogTitle.textContent = "Cancelar missão";
  els.statusDialogBody.innerHTML = `
    <p>Deseja marcar esta missão como cancelada? Ela continuará aparecendo no planner e poderá ser reativada depois.</p>
    <div class="status-mission-summary"><strong>${escapeHtml(mission.name)}</strong><span>${formatDate(mission.startDate)} a ${formatDate(mission.endDate)}</span></div>
  `;
  els.statusDialogActions.innerHTML = `
    <button class="secondary-button" type="button" onclick="closeStatusDialog()">Voltar</button>
    <button class="danger-button" type="button" onclick="confirmCancelMission()">Confirmar cancelamento</button>
  `;
  els.missionDialog.close();
  els.statusDialog.showModal();
}

function confirmCancelMission() {
  const mission = state.missions.find((item) => item.id === state.pendingStatusMissionId);
  if (!mission) return closeStatusDialog();
  mission.status = "cancelled";
  persist();
  closeStatusDialog();
  renderAll();
  showToast("Missão cancelada. As aeronaves designadas foram liberadas.");
}

function requestReactivateMission(id) {
  if (!requireCloudEditor("reativar missões")) return;
  const mission = state.missions.find((item) => item.id === id);
  if (!mission) return;
  state.pendingStatusMissionId = id;
  const conflicts = reactivationConflicts(mission);
  els.statusDialogTitle.textContent = "Reativar missão";

  if (!conflicts.length) {
    els.statusDialogBody.innerHTML = `
      <p>Deseja reativar esta missão? Ela voltará a consumir disponibilidade de aeronaves no período planejado.</p>
      <div class="status-mission-summary"><strong>${escapeHtml(mission.name)}</strong><span>${formatDate(mission.startDate)} a ${formatDate(mission.endDate)}</span></div>
    `;
    els.statusDialogActions.innerHTML = `
      <button class="secondary-button" type="button" onclick="closeStatusDialog()">Voltar</button>
      <button class="primary-button" type="button" onclick="confirmReactivateMission(false)">Reativar missão</button>
    `;
  } else {
    els.statusDialogBody.innerHTML = `
      <p>Esta missão possui aeronaves que agora estão em conflito com outras missões ativas. Deseja reativar mesmo assim ou remover as aeronaves conflitantes?</p>
      <div class="conflict-list">${conflicts.map((conflict) => `
        <div><strong>Aeronave ${escapeHtml(conflict.aircraftNumber)}</strong><span>Conflito com ${escapeHtml(conflict.missionName)} de ${formatDate(conflict.startDate)} a ${formatDate(conflict.endDate)}</span></div>
      `).join("")}</div>
    `;
    els.statusDialogActions.innerHTML = `
      <button class="secondary-button" type="button" onclick="closeStatusDialog()">Cancelar reativação</button>
      <button class="danger-outline-button" type="button" onclick="confirmReactivateMission(false)">Reativar e manter aeronaves</button>
      <button class="primary-button" type="button" onclick="confirmReactivateMission(true)">Reativar removendo conflitos</button>
    `;
  }
  els.missionDialog.close();
  els.statusDialog.showModal();
}

function reactivationConflicts(mission) {
  const conflicts = [];
  mission.aircraftAssigned.forEach((aircraftId) => {
    state.missions
      .filter((other) =>
        other.id !== mission.id
        && other.status === "planned"
        && other.aircraftAssigned.some((ref) => aircraftRefMatches(ref, aircraftId))
        && rangesOverlap(mission.startDate, mission.endDate, other.startDate, other.endDate)
      )
      .forEach((other) => {
        conflicts.push({
          aircraftId,
          aircraftNumber: state.aircraft.find((aircraft) => aircraft.id === aircraftId)?.number || aircraftId,
          missionName: other.name,
          startDate: other.startDate,
          endDate: other.endDate,
        });
      });
  });
  return conflicts;
}

function confirmReactivateMission(removeConflicts) {
  const mission = state.missions.find((item) => item.id === state.pendingStatusMissionId);
  if (!mission) return closeStatusDialog();
  const conflictingIds = new Set(reactivationConflicts(mission).map((conflict) => conflict.aircraftId));
  if (removeConflicts) {
    mission.aircraftAssigned = mission.aircraftAssigned.filter((aircraftId) => !conflictingIds.has(aircraftId));
  }
  mission.status = "planned";
  persist();
  closeStatusDialog();
  renderAll();
  showToast(removeConflicts && conflictingIds.size
    ? "Missão reativada e aeronaves conflitantes removidas."
    : "Missão reativada.");
}

function closeStatusDialog() {
  if (els.statusDialog.open) els.statusDialog.close();
  state.pendingStatusMissionId = null;
}

function renderAircraftSlots(preselected = null) {
  const count = Math.max(1, Number(document.getElementById("missionAircraftCount").value || 1));
  const mission = missionFormData(document.getElementById("missionId").value || "draft");
  const currentSelected = (preselected || [...document.querySelectorAll(".aircraft-select")].map((select) => select.value))
    .map((ref) => aircraftRefId(ref))
    .filter(Boolean);
  const slots = [];

  for (let index = 0; index < count; index += 1) {
    const selectedForSlot = currentSelected[index] || "";
    const selectedInOtherSlots = currentSelected.filter((id, selectedIndex) => selectedIndex !== index && id);
    const available = availableAircraftForMission(mission, selectedInOtherSlots);
    const selectedAircraft = state.aircraft.find((aircraft) => aircraft.id === selectedForSlot);
    if (selectedAircraft && !available.some((aircraft) => aircraft.id === selectedForSlot)) available.unshift(selectedAircraft);
    const options = available
      .map((aircraft) => {
        const capabilities = ["VFR", "IFR", "OVN"].filter((capability) => aircraft.capabilities[capability]).join(" / ");
        return `<option value="${aircraft.id}" ${aircraft.id === selectedForSlot ? "selected" : ""}>${escapeHtml(aircraft.number)} — ${capabilities}</option>`;
      })
      .join("");
    slots.push(`
      <select class="aircraft-select" aria-label="Aeronave ${index + 1}">
        <option value="">Aeronave ${index + 1}: A definir</option>
        ${options}
      </select>
    `);
  }

  els.aircraftSlots.innerHTML = slots.join("");
  document.querySelectorAll(".aircraft-select").forEach((select) => {
    select.addEventListener("change", () => renderAircraftSlots());
  });
  els.availableAircraftHint.textContent = `${availableAircraftForMission(mission, []).length} disponíveis`;
}

function availableAircraftForMission(mission, excludedIds = []) {
  // Regra principal de disponibilidade usada pelos dropdowns de aeronaves.
  return state.aircraft
    .filter((aircraft) => aircraft.status === "up")
    .filter((aircraft) => aircraft.capabilities[mission.flightType])
    .filter((aircraft) => !mission.requirements.armament || aircraft.capabilities.arm)
    .filter((aircraft) => !mission.requirements.winch || aircraft.capabilities.winch)
    .filter((aircraft) => !mission.requirements.hook || aircraft.capabilities.hook)
    .filter((aircraft) => !excludedIds.includes(aircraft.id))
    .filter((aircraft) => !hasAircraftUnavailabilityConflict(aircraft.id, mission.startDate, mission.endDate))
    .filter((aircraft) => !hasAircraftDateConflict(aircraft.id, mission));
}

function hasAircraftUnavailabilityConflict(aircraftId, startDate, endDate) {
  if (!aircraftId || !startDate || !endDate) return false;
  return state.unavailability.some((item) =>
    item.aircraftId === aircraftId
    && rangesOverlap(item.startDate, item.endDate, startDate, endDate)
  );
}

function hasAircraftDateConflict(aircraftId, mission) {
  if (!mission.startDate || !mission.endDate) return false;
  // Ao editar uma missao, ela nao deve conflitar consigo mesma.
  return state.missions.some((other) => {
    if (other.id === mission.id) return false;
    if (other.status === "cancelled") return false;
    if (!other.aircraftAssigned.some((ref) => aircraftRefMatches(ref, aircraftId))) return false;
    return missionUsesAircraftOnOverlappingDates(other, aircraftId, mission.startDate, mission.endDate);
  });
}

function missionUsesAircraftOnOverlappingDates(mission, aircraftId, startDate, endDate) {
  if (!rangesOverlap(mission.startDate, mission.endDate, startDate, endDate)) return false;
  if (!Array.isArray(mission.dailyPlanning) || !mission.dailyPlanning.length || state.sheetConfig.dailyBlockingMode === "period") return true;
  return mission.dailyPlanning.some((day) =>
    day.date >= startDate
    && day.date <= endDate
    && (day.aircraftAssigned || []).some((ref) => aircraftRefMatches(ref, aircraftId))
  );
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function getWeekRange(referenceDate = new Date()) {
  const baseDate = referenceDate instanceof Date ? referenceDate : parseIsoDate(referenceDate);
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = addDays(date, diffToMonday);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(addDays(start, 6)),
  };
}

function getCurrentWeekRange(baseDate = new Date()) {
  return getWeekRange(baseDate);
}

function getNextWeekRange(baseDate = new Date()) {
  const current = getWeekRange(baseDate);
  const start = addDays(parseIsoDate(current.startDate), 7);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(addDays(start, 6)),
  };
}

function getMissionsOverlappingWeek(weekStart, weekEnd, includeCancelled = true) {
  return getMissionsOverlappingRange(weekStart, weekEnd, includeCancelled);
}

function getMissionsOverlappingRange(startDate, endDate, includeCancelled = true) {
  return sortedMissions()
    .filter((mission) => includeCancelled || mission.status !== "cancelled")
    .filter((mission) => rangesOverlap(mission.startDate, mission.endDate, startDate, endDate))
    .sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
      || missionStatusOrder(a) - missionStatusOrder(b)
      || a.name.localeCompare(b.name, "pt-BR")
    );
}

function assignWeeklyMissionLanes(missions, weekStart, weekEnd) {
  const ordered = [...missions].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
    || a.endDate.localeCompare(b.endDate)
    || a.name.localeCompare(b.name, "pt-BR")
  );
  const laneEnds = [];
  const lanesByMission = new Map();

  ordered.forEach((mission) => {
    const visualStart = mission.startDate < weekStart ? weekStart : mission.startDate;
    const visualEnd = mission.endDate > weekEnd ? weekEnd : mission.endDate;
    let lane = laneEnds.findIndex((endDate) => endDate < visualStart);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = visualEnd;
    lanesByMission.set(mission.id, lane);
  });

  return {
    count: laneEnds.length,
    lanesByMission,
  };
}

function getActiveMissionsForDate(date) {
  const iso = typeof date === "string" ? date : toIsoDate(date);
  return state.missions.filter((mission) =>
    mission.status !== "cancelled"
    && mission.startDate <= iso
    && mission.endDate >= iso
  );
}

function getAircraftDemandForDate(date) {
  const missions = getActiveMissionsForDate(date);
  const assignedIds = new Set();
  let required = 0;
  let assigned = 0;
  let pending = 0;

  missions.forEach((mission) => {
    const daily = dailyPlanningForDate(mission, date);
    if (mission.dailyPlanning?.length && state.sheetConfig.dailyBlockingMode === "daily" && !daily) return;
    const missionAssigned = daily ? (daily.aircraftAssigned || []) : mission.aircraftAssigned.filter(Boolean);
    const missionRequired = daily ? Number(daily.aircraftRequired || 0) : mission.aircraftRequired;
    required += missionRequired;
    assigned += missionAssigned.length;
    pending += Math.max(0, missionRequired - missionAssigned.length);
    missionAssigned.forEach((aircraftId) => assignedIds.add(aircraftId));
  });

  return {
    missions,
    required,
    assigned,
    pending,
    assignedIds: [...assignedIds],
  };
}

function getAircraftAvailabilityForDate(date) {
  const demand = getAircraftDemandForDate(date);
  const upAircraft = state.aircraft.filter((aircraft) => aircraft.status === "up");
  const downAircraft = state.aircraft.filter((aircraft) => aircraft.status === "down");
  const iso = typeof date === "string" ? date : toIsoDate(date);
  const unavailableIds = new Set(state.unavailability
    .filter((item) => item.startDate <= iso && item.endDate >= iso)
    .map((item) => item.aircraftId));
  const assignedUpIds = demand.assignedIds.filter((aircraftRef) => upAircraft.some((aircraft) => aircraftRefMatches(aircraftRef, aircraft.id)));
  const availableAircraft = upAircraft.filter((aircraft) =>
    !unavailableIds.has(aircraft.id)
    && !assignedUpIds.some((aircraftRef) => aircraftRefMatches(aircraftRef, aircraft.id))
  );
  return {
    total: state.aircraft.length,
    up: upAircraft.length,
    down: downAircraft.length,
    unavailable: unavailableIds.size,
    assignedToday: assignedUpIds.length,
    availableNow: availableAircraft.length,
    availableAircraft,
    demand,
    theoreticalBalance: upAircraft.length - demand.required,
  };
}

function getDailyAircraftDemand(date) {
  return getAircraftDemandForDate(date);
}

function getWeeklyAircraftSummary(startDate, endDate) {
  const days = dateRange(startDate, endDate);
  const daily = days.map((date) => {
    const demand = getAircraftDemandForDate(date);
    const up = state.aircraft.filter((aircraft) => aircraft.status === "up").length;
    return {
      date,
      demand: demand.required,
      assigned: demand.assigned,
      pending: demand.pending,
      up,
      balance: up - demand.required,
    };
  });
  const maxDemand = daily.reduce((max, day) => day.demand > max.demand ? day : max, daily[0] || { demand: 0, date: startDate });
  const minAvailability = daily.reduce((min, day) => day.balance < min.balance ? day : min, daily[0] || { balance: 0, date: startDate });
  return {
    daily,
    maxDemand,
    minAvailability,
    up: state.aircraft.filter((aircraft) => aircraft.status === "up").length,
    pendingTotal: daily.reduce((sum, day) => sum + day.pending, 0),
    deficitDays: daily.filter((day) => day.balance < 0),
  };
}

function getDashboardAlerts() {
  const alerts = [];
  const currentWeek = getWeekRange(state.dashboardReferenceDate);
  const activeMissions = state.missions.filter((mission) => mission.status !== "cancelled");
  const futureMissions = activeMissions.filter((mission) => mission.endDate >= toIsoDate(new Date()));

  activeMissions.forEach((mission) => {
    const pending = Math.max(0, mission.aircraftRequired - mission.aircraftAssigned.length);
    if (pending) {
      alerts.push({
        type: "warning",
        label: "Aeronaves a definir",
        text: `${mission.name}: ${pending} a definir`,
        action: `openMissionDetails('${mission.id}')`,
      });
    }
  });

  getWeeklyAircraftSummary(currentWeek.startDate, currentWeek.endDate).deficitDays.forEach((day) => {
    alerts.push({
      type: "danger",
      label: "Déficit de aeronaves",
      text: `${formatDate(day.date)}: demanda ${day.demand}, em cima ${day.up}`,
      action: `showView('plannerView')`,
    });
  });

  futureMissions.forEach((mission) => {
    mission.aircraftAssigned.forEach((aircraftId) => {
      const aircraft = state.aircraft.find((item) => item.id === aircraftId);
      if (!aircraft) return;
      if (aircraft.status === "down") {
        alerts.push({
          type: "danger",
          label: "Baixada designada",
          text: `${aircraft.number} em ${mission.name}`,
          action: `openMissionDetails('${mission.id}')`,
        });
      }
      if (!aircraft.capabilities[mission.flightType]
        || (mission.requirements.armament && !aircraft.capabilities.arm)
        || (mission.requirements.winch && !aircraft.capabilities.winch)
        || (mission.requirements.hook && !aircraft.capabilities.hook)) {
        alerts.push({
          type: "danger",
          label: "Capacidade incompatível",
          text: `${aircraft.number} em ${mission.name}`,
          action: `openMissionDetails('${mission.id}')`,
        });
      }
      const conflicts = activeMissions.filter((other) =>
        other.id !== mission.id
        && other.aircraftAssigned.some((ref) => String(ref) === String(aircraftId))
        && rangesOverlap(mission.startDate, mission.endDate, other.startDate, other.endDate)
      );
      conflicts.forEach((other) => {
        if (mission.id < other.id) {
          alerts.push({
            type: "danger",
            label: "Conflito de designação",
            text: `${aircraft.number}: ${mission.name} / ${other.name}`,
            action: `openMissionDetails('${mission.id}')`,
          });
        }
      });
    });
  });

  return alerts;
}

function renderDashboard() {
  if (!els.dashboardAircraftSummary) return;
  const today = toIsoDate(new Date());
  const currentWeek = getWeekRange(state.dashboardReferenceDate);
  const nextWeek = getNextWeekRange(parseIsoDate(state.dashboardReferenceDate));
  const showCancelled = document.getElementById("showDashboardCancelled")?.checked ?? true;
  const todayAvailability = getAircraftAvailabilityForDate(today);
  renderCompactAircraftAvailability(todayAvailability);

  els.dashboardCurrentWeekTitle.textContent = formatWeekRange(currentWeek.startDate, currentWeek.endDate);
  els.dashboardNextWeekTitle.textContent = formatWeekRange(nextWeek.startDate, nextWeek.endDate);
  renderWeeklyTimeline({
    container: els.dashboardCurrentWeekTimeline,
    weekStart: currentWeek.startDate,
    weekEnd: currentWeek.endDate,
    showCancelled,
    expanded: state.expandedDashboardWeeks.current,
    isCurrentWeek: rangesOverlap(today, today, currentWeek.startDate, currentWeek.endDate),
    toggleButton: document.getElementById("toggleCurrentWeekLanesButton"),
  });
  renderWeeklyTimeline({
    container: els.dashboardNextWeekTimeline,
    weekStart: nextWeek.startDate,
    weekEnd: nextWeek.endDate,
    showCancelled,
    expanded: state.expandedDashboardWeeks.next,
    isCurrentWeek: rangesOverlap(today, today, nextWeek.startDate, nextWeek.endDate),
    toggleButton: document.getElementById("toggleNextWeekLanesButton"),
  });
  renderCompactAlerts();
}

function renderCompactAircraftAvailability(todayAvailability) {
  els.dashboardAircraftSummary.innerHTML = `
    <span>Em cima: <strong>${todayAvailability.up}</strong></span>
    <span>Baixadas: <strong>${todayAvailability.down}</strong></span>
    <span>Em missão hoje: <strong>${todayAvailability.assignedToday}</strong></span>
    <span>Livres hoje: <strong>${todayAvailability.availableNow}</strong></span>
  `;
}

function renderWeeklyTimeline({ container, weekStart, weekEnd, showCancelled, expanded, isCurrentWeek, toggleButton }) {
  const missions = getMissionsOverlappingWeek(weekStart, weekEnd, showCancelled);
  const laneLayout = assignWeeklyMissionLanes(missions, weekStart, weekEnd);
  const visibleLaneCount = laneLayout.count;
  const days = dateRange(weekStart, weekEnd);
  const today = toIsoDate(new Date());

  if (toggleButton) toggleButton.hidden = true;

  const dayHeaders = days.map((date) => {
    const dayClass = isCurrentWeek && date === today ? "timeline-today" : isCurrentWeek && date < today ? "timeline-past" : "";
    return `<div class="timeline-day-header ${dayClass}">${formatShortWeekday(date)}</div>`;
  }).join("");

  const laneRows = Array.from({ length: visibleLaneCount }, (_, lane) => {
    const rowMissions = missions.filter((mission) => laneLayout.lanesByMission.get(mission.id) === lane);
    const bars = rowMissions.map((mission) => renderWeeklyMissionBar(mission, weekStart, weekEnd)).join("");
    return `<div class="timeline-lane" style="grid-row: ${lane + 2};">${bars}</div>`;
  }).join("");

  const footers = days.map((date) => {
    const demand = getDailyAircraftDemand(date);
    const up = state.aircraft.filter((aircraft) => aircraft.status === "up").length;
    const level = demand.required > up ? "danger" : demand.required === up && up > 0 ? "warning" : "ok";
    const dayClass = isCurrentWeek && date === today ? "timeline-today" : isCurrentWeek && date < today ? "timeline-past" : "";
    return `<div class="timeline-day-footer timeline-${level} ${dayClass}">${demand.required}/${up}</div>`;
  }).join("");

  container.innerHTML = `
    <div class="timeline-scroll">
      <div class="timeline-grid" style="--timeline-rows: ${Math.max(visibleLaneCount, 1)};">
        ${dayHeaders}
        ${visibleLaneCount ? laneRows : `<div class="timeline-empty">Nenhuma missão neste período.</div>`}
        ${footers}
      </div>
    </div>
  `;
}

function renderWeeklyMissionBar(mission, weekStart, weekEnd) {
  const visualStart = mission.startDate < weekStart ? weekStart : mission.startDate;
  const visualEnd = mission.endDate > weekEnd ? weekEnd : mission.endDate;
  const startIndex = dateDiffInDays(weekStart, visualStart);
  const endIndex = dateDiffInDays(weekStart, visualEnd);
  const startsBeforeWeek = mission.startDate < weekStart;
  const endsAfterWeek = mission.endDate > weekEnd;
  const isStart = mission.startDate === visualStart;
  const isEnd = mission.endDate === visualEnd;
  const selected = mission.aircraftAssigned.length;
  const pending = Math.max(0, mission.aircraftRequired - selected);
  const cancelled = mission.status === "cancelled";
  const segmentClass = startsBeforeWeek && endsAfterWeek
    ? "mission-middle"
    : startsBeforeWeek
      ? "mission-end"
      : endsAfterWeek
        ? "mission-start"
        : isStart && isEnd
          ? "mission-single-day"
          : isStart
            ? "mission-start"
            : isEnd
              ? "mission-end"
              : "mission-middle";
  const continuation = [startsBeforeWeek ? "continua do período anterior" : "", endsAfterWeek ? "continua depois da semana" : ""].filter(Boolean).join(" · ");
  const title = `${cancelled ? "CANCELADA · " : ""}${mission.name} · ${mission.aircraftRequired} ANV${pending ? ` · ${pending} a definir` : ""}${continuation ? ` · ${continuation}` : ""}`;
  return `
    <button class="weekly-mission-bar ${segmentClass} ${cancelled ? "weekly-mission-cancelled" : ""}" style="grid-column: ${startIndex + 1} / ${endIndex + 2};" title="${escapeHtml(title)}" type="button" onclick="openDashboardMissionSummary('${mission.id}')">
      <span>${cancelled ? "CANCELADA · " : ""}${escapeHtml(shortMissionName(mission.name))} · ${mission.aircraftRequired} ANV${pending ? ` · ${pending} a definir` : ""}</span>
    </button>
  `;
}

function renderCompactAlerts() {
  const alerts = getDashboardAlerts();
  if (!alerts.length) {
    els.dashboardAlertCompact.innerHTML = `<span class="alert-clear">Sem alertas</span>`;
    return;
  }
  const hasDanger = alerts.some((alert) => alert.type === "danger");
  els.dashboardAlertCompact.innerHTML = `<button class="dashboard-alert-button ${hasDanger ? "has-danger" : ""}" type="button" onclick="openDashboardAlerts()">${alerts.length} alerta${alerts.length > 1 ? "s" : ""}</button>`;
}

function openDashboardMissionSummary(id) {
  const mission = state.missions.find((item) => item.id === id);
  if (!mission) return;
  const selected = mission.aircraftAssigned.length;
  const pending = Math.max(0, mission.aircraftRequired - selected);
  els.statusDialogTitle.textContent = "Resumo da missão";
  els.statusDialogBody.innerHTML = `
    <div class="status-mission-summary ${mission.status === "cancelled" ? "dashboard-cancelled" : ""}">
      <strong>${mission.status === "cancelled" ? "CANCELADA · " : ""}${escapeHtml(mission.name)}</strong>
      <span>${formatDate(mission.startDate)} a ${formatDate(mission.endDate)}</span>
      <span>${mission.aircraftRequired} ANV previstas · ${selected} designada(s) · ${pending} a definir</span>
      <span>Numerais: ${escapeHtml(aircraftNumbers(mission).join(", ") || "a definir")}</span>
      <span>HDV: ${escapeHtml(mission.flightHoursAvailable || "não informada")}</span>
      <span>Status: ${mission.status === "cancelled" ? "Cancelada" : "Planejada"}</span>
    </div>
  `;
  els.statusDialogActions.innerHTML = `
    <button class="secondary-button" type="button" onclick="closeStatusDialog()">Fechar</button>
    <button class="primary-button" type="button" onclick="closeStatusDialog(); editMission('${mission.id}')">Ver detalhes</button>
  `;
  els.statusDialog.showModal();
}

function openDashboardAlerts() {
  const alerts = getDashboardAlerts();
  els.statusDialogTitle.textContent = "Alertas operacionais";
  els.statusDialogBody.innerHTML = alerts.length
    ? `<div class="compact-alert-list">${alerts.map((alert) => `
      <button class="dashboard-alert alert-${alert.type}" type="button" onclick="closeStatusDialog(); ${alert.action}">
        <strong>${escapeHtml(alert.label)}</strong>
        <span>${escapeHtml(alert.text)}</span>
      </button>
    `).join("")}</div>`
    : `<p class="muted">Sem alertas.</p>`;
  els.statusDialogActions.innerHTML = `<button class="secondary-button" type="button" onclick="closeStatusDialog()">Fechar</button>`;
  els.statusDialog.showModal();
}

function moveDashboardWeek(days) {
  state.dashboardReferenceDate = toIsoDate(addDays(parseIsoDate(state.dashboardReferenceDate), days));
  state.expandedDashboardWeeks.current = false;
  state.expandedDashboardWeeks.next = false;
  renderDashboard();
}

function toggleDashboardWeek(key) {
  state.expandedDashboardWeeks[key] = !state.expandedDashboardWeeks[key];
  renderDashboard();
}

function renderMissionsList() {
  const today = toIsoDate(new Date());
  const filteredMissions = sortedMissions().filter((mission) => {
    if (state.missionFilter === "all") return true;
    if (state.missionFilter === "cancelled") return mission.status === "cancelled";
    return mission.status !== "cancelled" && mission.endDate >= today;
  });
  if (!filteredMissions.length) {
    els.missionsList.innerHTML = `<p class="muted">Nenhuma missão cadastrada.</p>`;
    return;
  }

  els.missionsList.innerHTML = filteredMissions
    .map((mission) => {
      const selected = mission.aircraftAssigned.length;
      const pending = Math.max(0, mission.aircraftRequired - selected);
      const numbers = aircraftNumbers(mission).join("/");
      const aircraftLine = `Anvs: ${String(mission.aircraftRequired || 0).padStart(2, "0")} - ${numbers}`;
      const statusText = mission.status === "cancelled" ? "CANCELADA" : mission.startDate <= today && mission.endDate >= today ? "EM CURSO" : mission.endDate < today ? "ENCERRADA" : "PREVISTA";
      return `
      <article class="mission-sheet-row ${mission.status === "cancelled" ? "mission-card-cancelled" : ""}">
        <button class="mission-sheet-main" type="button" onclick="openMissionDetails('${mission.id}')">
          <strong>${mission.status === "cancelled" ? "CANCELADA — " : ""}${escapeHtml(mission.name)}</strong>
          <span>${escapeHtml(mission.location || "sem local")}</span>
          <span>${formatDate(mission.startDate)} a ${formatDate(mission.endDate)}</span>
          <span>${escapeHtml(mission.flightType || "VFR")}</span>
          <span>${escapeHtml(aircraftLine)}</span>
          <span>HV: ${escapeHtml(mission.flightHoursDisplay || mission.flightHoursAvailable || "—")}</span>
          <span class="${pending ? "pending-text" : ""}">${pending ? `${pending} a definir` : "completa"}</span>
          <span class="mission-sheet-status">${statusText}</span>
        </button>
        <div class="mission-sheet-actions">
          <button class="secondary-button" type="button" onclick="editMission('${mission.id}')">Editar</button>
          <button class="${mission.status === "cancelled" ? "primary-button" : "danger-outline-button"}" type="button" onclick="${mission.status === "cancelled" ? "requestReactivateMission" : "requestCancelMission"}('${mission.id}')">${mission.status === "cancelled" ? "Reativar" : "Cancelar missão"}</button>
          <button class="ghost-button" type="button" onclick="deleteMission('${mission.id}')">Excluir</button>
        </div>
      </article>
    `;})
    .join("");
}

function renderMissionsTable() {
  if (!state.missions.length) {
    els.missionsTableBody.innerHTML = `<tr><td colspan="10">Nenhuma missão cadastrada.</td></tr>`;
    return;
  }

  els.missionsTableBody.innerHTML = sortedMissions()
    .map((mission) => {
      const selected = mission.aircraftAssigned.length;
      const pending = Math.max(0, mission.aircraftRequired - selected);
      return `
      <tr class="${mission.status === "cancelled" ? "mission-row-cancelled" : ""}">
        <td><span class="status-pill ${mission.status === "cancelled" ? "mission-status-cancelled" : "mission-status-planned"}">${mission.status === "cancelled" ? "Cancelada" : "Ativa"}</span></td>
        <td>${formatDate(mission.startDate)}</td>
        <td>${formatDate(mission.endDate)}</td>
        <td><button class="ghost-button" type="button" onclick="openMissionDetails('${mission.id}')">${escapeHtml(mission.name)}</button></td>
        <td>${escapeHtml(mission.location || "")}</td>
        <td>${mission.flightType}</td>
        <td><strong>${mission.aircraftRequired} previstas</strong><br>${selected} selecionadas<br><span class="${pending ? "pending-text" : ""}">${pending} a definir</span><br><span class="item-meta">${escapeHtml(aircraftNumbers(mission).join(", ") || "Sem numerais")}</span></td>
        <td>${escapeHtml(mission.flightHoursAvailable || "—")}</td>
        <td>${escapeHtml(mission.details || "")}</td>
        <td class="table-actions">
          <button class="secondary-button" type="button" onclick="editMission('${mission.id}')">Editar</button>
          <button class="${mission.status === "cancelled" ? "primary-button" : "danger-outline-button"}" type="button" onclick="${mission.status === "cancelled" ? "requestReactivateMission" : "requestCancelMission"}('${mission.id}')">${mission.status === "cancelled" ? "Reativar" : "Cancelar"}</button>
        </td>
      </tr>
    `;})
    .join("");
}

function assignMissionLanes(missions) {
  const ordered = [...missions].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
    || a.endDate.localeCompare(b.endDate)
    || a.name.localeCompare(b.name, "pt-BR")
  );
  const laneEnds = [];
  const lanesByMission = new Map();

  ordered.forEach((mission) => {
    // Como as datas sao inclusivas, a lane so fica livre no dia seguinte ao fim.
    let lane = laneEnds.findIndex((endDate) => endDate < mission.startDate);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = mission.endDate;
    lanesByMission.set(mission.id, lane);
  });

  return {
    count: laneEnds.length,
    lanesByMission,
  };
}

function renderCalendar() {
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(state.currentYear, state.currentMonth, 1));
  els.currentMonthLabel.textContent = monthName.replace(/^\w/, (letter) => letter.toUpperCase());

  const first = new Date(state.currentYear, state.currentMonth, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  const showCancelled = document.getElementById("showCancelledMissions").checked;
  const visibleMissions = state.missions.filter((mission) => {
    if (!showCancelled && mission.status === "cancelled") return false;
    // Inclui missoes que comecam antes ou terminam depois do periodo visivel.
    const monthStart = toIsoDate(days[0]);
    const monthEnd = toIsoDate(days[days.length - 1]);
    return rangesOverlap(mission.startDate, mission.endDate, monthStart, monthEnd);
  });
  const plannerAircraft = plannerAircraftRows();
  const activeDemandCount = visibleMissions
    .filter((mission) => mission.status === "planned")
    .reduce((sum, mission) => sum + Math.max(0, mission.aircraftRequired || 0), 0);
  const activeCount = visibleMissions.filter((mission) => mission.status === "planned").length;
  const cancelledCount = visibleMissions.length - activeCount;
  els.plannerSummary.textContent = `${activeCount} ativa(s)${showCancelled ? ` · ${cancelledCount} cancelada(s)` : ""} · ${plannerAircraft.length} linha(s) de aeronave · demanda ativa geral ${activeDemandCount} ANV.`;

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const header = weekdays.map((day) => `<div class="weekday">${day}</div>`).join("");
  const todayIso = toIsoDate(new Date());
  const cells = days.map((date) => {
    const iso = toIsoDate(date);
    const dateStateClass = iso === todayIso ? "today" : iso < todayIso ? "past-day" : "";
    const showAircraftLabels = date.getDay() === 0;
    const pendingPlan = pendingMissionSlotsForDate(visibleMissions, plannerAircraft, iso);
    const aircraftLanes = plannerAircraft.map((aircraft) => {
      const unavailability = aircraftUnavailabilityForDate(aircraft.id, iso);
      const assignedMission = visibleMissions.find((mission) => missionUsesAircraftOnDate(mission, aircraft.id, iso));
      const pendingMission = pendingPlan.allocated.get(aircraft.id);
      const down = aircraft.status === "down";
      const rowClass = down ? "planner-aircraft-row-down" : "";
      const block = unavailability
        ? renderUnavailabilityCalendarBlock(unavailability, aircraft, iso, date)
        : assignedMission
          ? renderMissionCalendarBlock(assignedMission, aircraft, iso, date)
          : !down && pendingMission
            ? renderPendingMissionCalendarBlock(pendingMission, iso, date)
            : "";
      return `
        <div class="planner-aircraft-row ${rowClass}" title="${escapeHtml(aircraft.number)}${down ? " baixada" : ""}">
          <span class="planner-aircraft-label">${showAircraftLabels ? escapeHtml(aircraft.number) : ""}</span>
          <div class="planner-aircraft-slot">${block}</div>
        </div>
      `;
    }).join("");
    const overflowLanes = pendingPlan.overflow.map((item) => `
      <div class="planner-aircraft-row planner-aircraft-row-deficit" title="Não há aeronave disponível para esta demanda">
        <span class="planner-aircraft-label">${showAircraftLabels ? "SEM ANV" : ""}</span>
        <div class="planner-aircraft-slot">${renderNoAircraftAvailableCalendarBlock(item.mission, item.slot, iso, date)}</div>
      </div>
    `).join("");
    const lanes = aircraftLanes + overflowLanes;

    return `
      <div class="day-cell ${date.getMonth() === state.currentMonth ? "" : "outside-month"} ${dateStateClass}">
        <div class="day-number">${date.getDate()}</div>
        <div class="mission-lanes planner-aircraft-lanes">${lanes || `<p class="planner-empty-aircraft">Cadastre aeronaves para ver as linhas do planner.</p>`}</div>
      </div>
    `;
  }).join("");

  els.calendar.innerHTML = `<div class="calendar-grid">${header}${cells}</div>`;
}

function plannerAircraftRows() {
  return state.aircraft
    .slice()
    .sort((a, b) =>
      (a.status === "down") - (b.status === "down")
      || a.number.localeCompare(b.number, "pt-BR", { numeric: true })
    );
}

function aircraftUnavailabilityForDate(aircraftId, date) {
  return state.unavailability
    .filter((item) => item.aircraftId === aircraftId && item.startDate <= date && item.endDate >= date)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null;
}

function missionUsesAircraftOnDate(mission, aircraftId, date) {
  if (mission.startDate > date || mission.endDate < date) return false;
  if (mission.status === "cancelled") {
    return mission.aircraftAssigned.some((ref) => aircraftRefMatches(ref, aircraftId));
  }
  if (Array.isArray(mission.dailyPlanning) && mission.dailyPlanning.length && state.sheetConfig.dailyBlockingMode !== "period") {
    const daily = dailyPlanningForDate(mission, date);
    return !!daily && (daily.aircraftAssigned || []).some((ref) => aircraftRefMatches(ref, aircraftId));
  }
  return mission.aircraftAssigned.some((ref) => aircraftRefMatches(ref, aircraftId));
}

function missionDemandForDate(mission, date) {
  const daily = dailyPlanningForDate(mission, date);
  if (daily) return Number(daily.aircraftRequired || 0);
  if (Array.isArray(mission.dailyPlanning) && mission.dailyPlanning.length && state.sheetConfig.dailyBlockingMode === "daily") return 0;
  return Number(mission.aircraftRequired || 0);
}

function missionAssignedRefsForDate(mission, date) {
  const daily = dailyPlanningForDate(mission, date);
  if (daily) return daily.aircraftAssigned || [];
  if (Array.isArray(mission.dailyPlanning) && mission.dailyPlanning.length && state.sheetConfig.dailyBlockingMode === "daily") return [];
  return mission.aircraftAssigned || [];
}

function pendingMissionSlotsForDate(missions, aircraftRows, date) {
  const allocated = new Map();
  const overflow = [];
  const occupiedIds = new Set();

  aircraftRows.forEach((aircraft) => {
    if (aircraft.status === "down" || aircraftUnavailabilityForDate(aircraft.id, date)) occupiedIds.add(aircraft.id);
  });

  missions
    .filter((mission) => mission.status !== "cancelled" && mission.startDate <= date && mission.endDate >= date)
    .forEach((mission) => {
      missionAssignedRefsForDate(mission, date).forEach((ref) => {
        const aircraft = state.aircraft.find((item) => aircraftRefMatches(ref, item.id));
        if (aircraft) occupiedIds.add(aircraft.id);
      });
    });

  missions
    .filter((mission) => mission.status !== "cancelled" && mission.startDate <= date && mission.endDate >= date)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name, "pt-BR"))
    .forEach((mission) => {
      const required = missionDemandForDate(mission, date);
      const assignedCount = missionAssignedRefsForDate(mission, date).length;
      let pending = Math.max(0, required - assignedCount);
      for (const aircraft of aircraftRows) {
        if (!pending) break;
        if (aircraft.status === "down" || occupiedIds.has(aircraft.id)) continue;
        allocated.set(aircraft.id, mission);
        occupiedIds.add(aircraft.id);
        pending -= 1;
      }
      while (pending > 0) {
        overflow.push({ mission, slot: pending });
        pending -= 1;
      }
    });

  return { allocated, overflow };
}

function calendarSegmentClass(startDate, endDate, iso, date) {
  const isStart = startDate === iso;
  const isEnd = endDate === iso;
  const startsVisualRow = isStart || date.getDay() === 0;
  const endsVisualRow = isEnd || date.getDay() === 6;
  if (startsVisualRow && endsVisualRow) return "mission-single-day";
  if (startsVisualRow) return "mission-start";
  if (endsVisualRow) return "mission-end";
  return "mission-middle";
}

function renderMissionCalendarBlock(mission, aircraft, iso, date) {
  const segmentClass = calendarSegmentClass(mission.startDate, mission.endDate, iso, date);
  const requiredForDay = missionDemandForDate(mission, iso) || mission.aircraftRequired;
  const selectedNumbers = missionAssignedRefsForDate(mission, iso).map((ref) => aircraftRefNumber(ref)).filter(Boolean);
  const pending = Math.max(0, requiredForDay - selectedNumbers.length);
  const cancelled = mission.status === "cancelled";
  const tooltip = `${cancelled ? "CANCELADA · " : ""}${mission.name} · ${aircraft.number} · ${requiredForDay} ANV · ${pending} a definir`;
  return `
    <button class="mission-block planner-compact-block mission-segment ${segmentClass} ${cancelled ? "mission-block-cancelled" : ""}" title="${escapeHtml(tooltip)}" type="button" onclick="openMissionDetails('${mission.id}')">
      <span>${cancelled ? "CANCELADA · " : ""}${escapeHtml(shortMissionName(mission.name))} · ${requiredForDay} ANV${pending ? ` · ${pending} def.` : ""}</span>
    </button>
  `;
}

function renderPendingMissionCalendarBlock(mission, iso, date) {
  const segmentClass = calendarSegmentClass(mission.startDate, mission.endDate, iso, date);
  const requiredForDay = missionDemandForDate(mission, iso) || mission.aircraftRequired;
  const assignedCount = missionAssignedRefsForDate(mission, iso).length;
  const pending = Math.max(0, requiredForDay - assignedCount);
  return `
    <button class="mission-block planner-compact-block mission-segment ${segmentClass} mission-block-pending" title="${escapeHtml(`${mission.name} · ${pending} aeronave(s) a definir`)}" type="button" onclick="openMissionDetails('${mission.id}')">
      <span>${escapeHtml(shortMissionName(mission.name))} · A DEFINIR · ${pending} def.</span>
    </button>
  `;
}

function renderNoAircraftAvailableCalendarBlock(mission, slot, iso, date) {
  const segmentClass = calendarSegmentClass(mission.startDate, mission.endDate, iso, date);
  const requiredForDay = missionDemandForDate(mission, iso) || mission.aircraftRequired;
  const tooltip = `${mission.name} · demanda sem aeronave disponível · ${requiredForDay} ANV previstas`;
  return `
    <button class="mission-block planner-compact-block mission-segment ${segmentClass} mission-block-deficit" title="${escapeHtml(tooltip)}" type="button" onclick="openMissionDetails('${mission.id}')">
      <span>${escapeHtml(shortMissionName(mission.name))} · SEM ANV DISP.</span>
    </button>
  `;
}

function renderUnavailabilityCalendarBlock(item, aircraft, iso, date) {
  const segmentClass = calendarSegmentClass(item.startDate, item.endDate, iso, date);
  const tooltip = `${aircraft.number} indisponível · ${item.reason} · ${formatDate(item.startDate)} a ${formatDate(item.endDate)}`;
  return `
    <button class="mission-block planner-compact-block mission-segment unavailability-block" title="${escapeHtml(tooltip)}" type="button" onclick="editUnavailability('${item.id}')">
      <span>${escapeHtml(item.reason || "Indisponível")}</span>
    </button>
  `;
}

function openMissionDetails(id) {
  const mission = state.missions.find((item) => item.id === id);
  if (!mission) return;
  const assignedAircraft = mission.aircraftAssigned
    .map((aircraftId) => state.aircraft.find((aircraft) => aircraft.id === aircraftId || aircraft.number === aircraftId))
    .filter(Boolean);
  const aircraftSlots = Array.from({ length: mission.aircraftRequired }, (_, index) => {
    const ref = mission.aircraftAssigned[index];
    const aircraft = assignedAircraft.find((item) => item.id === ref || item.number === ref);
    if (!ref) return `<div class="detail-aircraft-slot pending-slot">ANV ${index + 1}: A DEFINIR</div>`;
    if (!aircraft) return `<div class="detail-aircraft-slot pending-slot">ANV ${index + 1}: ${escapeHtml(ref)} — aeronave não cadastrada</div>`;
    const capabilities = ["VFR", "IFR", "OVN"].filter((capability) => aircraft.capabilities[capability]).join(" / ");
    return `<div class="detail-aircraft-slot">ANV ${index + 1}: ${escapeHtml(aircraft.number)} — ${capabilities}</div>`;
  }).join("");
  const dailyPlanningDetails = mission.dailyPlanning?.length
    ? `
      <div class="document-detail-section">
        <h3>Programação diária</h3>
        <div class="daily-planning-list">
          ${mission.dailyPlanning.map((day) => `
            <div class="daily-planning-row">
              <strong>${formatDate(day.date)}</strong>
              <span>${day.aircraftRequired || 0} ANV · ${escapeHtml((day.aircraftAssigned || []).map((ref) => aircraftRefNumber(ref)).join(", ") || "sem numeral definido")}</span>
              ${day.crews?.length ? `<small>${escapeHtml(day.crews.map((crew) => [crew.aircraft, crew.po, crew.poPt, crew.pt, crew.mv].filter(Boolean).join(" / ")).join(" · "))}</small>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `
    : "";
  const importedDetails = mission.sourceDocument || mission.reference || mission.supportedTroop || mission.airUnit
    ? `
      <div class="document-detail-section">
        <h3>Dados do documento</h3>
        <div class="detail-grid">
          <div><strong>Documento de origem</strong>${escapeHtml(mission.sourceDocument || "Não identificado")}</div>
          <div><strong>Referência</strong>${escapeHtml(mission.reference || "Não identificada")}</div>
          <div><strong>Tropa apoiada</strong>${escapeHtml(mission.supportedTroop || "Não identificada")}</div>
          <div><strong>SU Ae / Fração</strong>${escapeHtml(mission.airUnit || "Não identificada")}</div>
          <div><strong>Modelo</strong>${escapeHtml(mission.aircraftModel || "Não identificado")}</div>
          <div><strong>Contato</strong>${escapeHtml([mission.contactName, mission.contactRole, mission.contactPhone].filter(Boolean).join(" · ") || "Não identificado")}</div>
        </div>
        ${mission.operationDetails.length ? `<div class="operation-detail-list">${mission.operationDetails.map((detail) => `<span>${escapeHtml(detail)}</span>`).join("")}</div>` : ""}
      </div>
    `
    : "";
  els.dialogTitle.textContent = mission.name;
  els.dialogBody.innerHTML = `
    <div class="mission-detail-status ${mission.status === "cancelled" ? "cancelled" : "planned"}">${mission.status === "cancelled" ? "MISSÃO CANCELADA — não consome disponibilidade de aeronaves" : "MISSÃO ATIVA"}</div>
    <div class="detail-grid">
      <div><strong>Status</strong>${mission.status === "cancelled" ? "Cancelada" : "Planejada/ativa"}</div>
      <div><strong>Período</strong>${formatDate(mission.startDate)} a ${formatDate(mission.endDate)}</div>
      <div><strong>Local</strong>${escapeHtml(mission.location || "Não informado")}</div>
      <div><strong>Tipo</strong>${mission.flightType}</div>
      <div><strong>Demanda</strong>${mission.aircraftRequired} previstas · ${mission.aircraftAssigned.length} selecionadas · ${Math.max(0, mission.aircraftRequired - mission.aircraftAssigned.length)} a definir</div>
      <div><strong>HV disponível</strong>${escapeHtml(mission.flightHoursDisplay || mission.flightHoursAvailable || "Não informado")}</div>
      <div><strong>Requisitos</strong>${escapeHtml(requirementsLabel(mission.requirements))}</div>
      <div><strong>Aeronaves</strong>${escapeHtml(aircraftNumbers(mission).join(", ") || "Todas a definir")}</div>
    </div>
    <div class="detail-aircraft-list">${aircraftSlots}</div>
    ${dailyPlanningDetails}
    ${importedDetails}
    <p class="muted" style="margin-top: 12px;">${escapeHtml(mission.details || "Sem observações.")}</p>
  `;
  els.dialogActions.innerHTML = `
    <button class="secondary-button" type="button" onclick="editMission('${mission.id}')">Editar</button>
    <button class="${mission.status === "cancelled" ? "primary-button" : "danger-outline-button"}" type="button" onclick="${mission.status === "cancelled" ? "requestReactivateMission" : "requestCancelMission"}('${mission.id}')">${mission.status === "cancelled" ? "Reativar missão" : "Cancelar missão"}</button>
    <button class="ghost-button" type="button" onclick="deleteMission('${mission.id}')">Excluir</button>
  `;
  els.missionDialog.showModal();
}

function moveMonth(delta) {
  const date = new Date(state.currentYear, state.currentMonth + delta, 1);
  state.currentMonth = date.getMonth();
  state.currentYear = date.getFullYear();
  renderCalendar();
}

function parseFreeText() {
  const text = document.getElementById("freeTextInput").value.trim();
  if (!text) return showToast("Cole um texto de missão para analisar.");
  const parsed = parseMissionText(text);
  document.getElementById("reviewName").value = parsed.name;
  document.getElementById("reviewStart").value = parsed.startDate;
  document.getElementById("reviewEnd").value = parsed.endDate;
  document.getElementById("reviewLocation").value = parsed.location;
  document.getElementById("reviewFlightType").value = parsed.flightType;
  document.getElementById("reviewAircraftCount").value = parsed.aircraftCount;
  document.getElementById("reviewFlightHours").value = parsed.flightHoursAvailable;
  document.getElementById("reviewRequiresArm").checked = parsed.requirements.armament;
  document.getElementById("reviewRequiresWinch").checked = parsed.requirements.winch;
  document.getElementById("reviewRequiresHook").checked = parsed.requirements.hook;
  document.getElementById("reviewDetails").value = parsed.details;
  els.reviewDialog.showModal();
}

function parseMissionText(text) {
  // Parser simples e evolutivo para textos livres em portugues.
  const upper = text.toUpperCase();
  const flightType = upper.match(/\b(VFR|IFR|OVN)\b/)?.[1] || "VFR";
  const count = Number(upper.match(/(\d+)\s+AERONAVE/)?.[1] || 1);
  const location = text.match(/\bem\s+([^,.;]+)/i)?.[1]?.trim() || "";
  const details = text.match(/observa[cç][aã]o:\s*(.+)$/i)?.[1]?.trim() || "";
  const flightHoursAvailable = text.match(/\bHDV\s*:?\s*([\d.,:]+)/i)?.[1]?.trim() || "";
  const name = text.split(",")[0].replace(/^miss[aã]o\s*/i, "Missão ").trim();
  const dateMatch = upper.match(/DE\s+(\d{1,2})\s+A\s+(\d{1,2})\s+([A-ZÇ]{3,})\s+(\d{4})/);
  const singleDateMatch = upper.match(/(\d{1,2})\s+([A-ZÇ]{3,})\s+(\d{4})/);
  let startDate = "";
  let endDate = "";

  if (dateMatch) {
    startDate = buildDate(dateMatch[1], dateMatch[3], dateMatch[4]);
    endDate = buildDate(dateMatch[2], dateMatch[3], dateMatch[4]);
  } else if (singleDateMatch) {
    startDate = buildDate(singleDateMatch[1], singleDateMatch[2], singleDateMatch[3]);
    endDate = startDate;
  }

  return {
    name,
    startDate,
    endDate,
    location,
    flightType,
    aircraftCount: count,
    flightHoursAvailable,
    requirements: {
      armament: /BRA[ÇC]O|ARMAMENTO/.test(upper),
      winch: /GUINCHO/.test(upper),
      hook: /GANCHO/.test(upper),
    },
    details,
  };
}

function saveReviewMission(event) {
  event.preventDefault();
  if (!requireCloudEditor("salvar missões importadas por texto")) return;
  const mission = {
    id: uid("mission"),
    name: document.getElementById("reviewName").value.trim(),
    startDate: document.getElementById("reviewStart").value,
    endDate: document.getElementById("reviewEnd").value,
    location: document.getElementById("reviewLocation").value.trim(),
    flightType: document.getElementById("reviewFlightType").value,
    aircraftRequired: Math.max(1, Number(document.getElementById("reviewAircraftCount").value || 1)),
    flightHoursAvailable: document.getElementById("reviewFlightHours").value.trim(),
    requirements: {
      armament: document.getElementById("reviewRequiresArm").checked,
      winch: document.getElementById("reviewRequiresWinch").checked,
      hook: document.getElementById("reviewRequiresHook").checked,
    },
    aircraftAssigned: [],
    details: document.getElementById("reviewDetails").value.trim(),
  };
  if (!validateMission(mission)) return;
  upsertMission(mission);
  els.reviewDialog.close();
  document.getElementById("freeTextInput").value = "";
  renderAll();
  showView("missionsView");
  editMission(mission.id);
  showToast("Missão importada. Selecione as aeronaves disponíveis.");
}

function selectPdfFile(event) {
  const file = event.target.files?.[0] || null;
  state.pendingPdfFile = file;
  const button = document.getElementById("processPdfButton");
  button.disabled = !file;
  els.pdfImportStatus.textContent = file
    ? `${file.name} · ${formatFileSize(file.size)}`
    : "Nenhum arquivo selecionado.";
}

async function processSelectedPdf() {
  if (!state.pendingPdfFile) return showToast("Selecione um arquivo PDF.");
  if (!window.PdfMissionImporter) return showToast("O leitor de PDF não foi carregado.");

  const button = document.getElementById("processPdfButton");
  button.disabled = true;
  button.textContent = "Extraindo texto...";
  els.pdfImportStatus.textContent = `Processando ${state.pendingPdfFile.name}...`;

  try {
    const rawText = await window.PdfMissionImporter.extractPdfText(state.pendingPdfFile);
    if (!rawText || rawText.length < 30) {
      throw new Error("O PDF não contém texto selecionável.");
    }
    const parsed = window.PdfMissionImporter.parseOFragMission(rawText);
    state.pendingImportedMission = parsed;
    fillPdfReviewForm(parsed);
    els.pdfImportStatus.textContent = `Texto extraído de ${state.pendingPdfFile.name}.`;
    els.pdfReviewDialog.showModal();
  } catch (error) {
    const scanned = /texto selecionável/i.test(error.message);
    els.pdfImportStatus.textContent = scanned
      ? "Não foi encontrado texto no PDF. O arquivo pode ser digitalizado como imagem."
      : "Não foi possível ler este PDF.";
    showToast(els.pdfImportStatus.textContent);
  } finally {
    button.disabled = false;
    button.textContent = "Extrair dados do PDF";
  }
}

function fillPdfReviewForm(mission) {
  const values = {
    pdfMissionName: mission.name,
    pdfReference: mission.reference,
    pdfSourceDocument: mission.sourceDocument,
    pdfAirUnit: mission.airUnit,
    pdfSupportedTroop: mission.supportedTroop,
    pdfLocation: mission.location,
    pdfStartDate: mission.startDate,
    pdfEndDate: mission.endDate,
    pdfFlightType: mission.flightType,
    pdfAircraftRequired: mission.aircraftRequired || "",
    pdfAircraftModel: mission.aircraftModel,
    pdfFlightHours: mission.flightHoursAvailable,
    pdfOperationDetails: mission.operationDetails.join("\n"),
    pdfContactName: mission.contactName,
    pdfContactRole: mission.contactRole,
    pdfContactPhone: mission.contactPhone,
    pdfNotes: mission.notes,
  };
  Object.entries(values).forEach(([id, value]) => {
    document.getElementById(id).value = value || "";
  });

  const requirementFields = {
    pdfReqArmament: "armament",
    pdfReqWinch: "winch",
    pdfReqHook: "hook",
    pdfReqIfr: "ifr",
    pdfReqOvn: "ovn",
    pdfReqRestrictedArea: "restrictedArea",
    pdfReqMedevac: "medevac",
    pdfReqParadrop: "paradrop",
    pdfReqAerialShooting: "aerialShooting",
  };
  Object.entries(requirementFields).forEach(([id, key]) => {
    document.getElementById(id).checked = !!mission.requirements[key];
  });

  syncPdfEndDate();
  const meta = mission.importMeta || {};
  const missing = meta.missingFields || [];
  const identifiedCount = 11 - missing.length;
  const unitMessage = meta.hasFirstEheg
    ? `1ª EHEG identificada${meta.otherAirUnits?.length ? `; outras frações citadas: ${meta.otherAirUnits.join(", ")}` : ""}.`
    : "Referência clara à 1ª EHEG não identificada.";
  els.pdfExtractionSummary.innerHTML = `
    <strong>${identifiedCount} de 11 campos principais identificados.</strong>
    <span>${escapeHtml(unitMessage)}</span>
    ${missing.length ? `<span class="missing-fields">Não identificados: ${escapeHtml(missing.join(", "))}.</span>` : ""}
  `;

  const requiresConfirmation = !meta.hasFirstEheg || !!meta.otherAirUnits?.length;
  document.getElementById("pdfAirUnitConfirmation").classList.toggle("visible", requiresConfirmation);
  document.getElementById("pdfConfirmAirUnit").checked = !requiresConfirmation;
}

function syncPdfEndDate() {
  const startInput = document.getElementById("pdfStartDate");
  const endInput = document.getElementById("pdfEndDate");
  endInput.min = startInput.value;
  if (startInput.value && (!endInput.value || endInput.value < startInput.value)) {
    endInput.value = startInput.value;
  }
}

function importedMissionFromReview() {
  const operationDetails = document.getElementById("pdfOperationDetails").value
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const notes = document.getElementById("pdfNotes").value.trim();
  return normalizeMission({
    id: uid("mission"),
    name: document.getElementById("pdfMissionName").value.trim(),
    sourceDocument: document.getElementById("pdfSourceDocument").value.trim(),
    reference: document.getElementById("pdfReference").value.trim(),
    supportedTroop: document.getElementById("pdfSupportedTroop").value.trim(),
    airUnit: document.getElementById("pdfAirUnit").value.trim(),
    startDate: document.getElementById("pdfStartDate").value,
    endDate: document.getElementById("pdfEndDate").value,
    location: document.getElementById("pdfLocation").value.trim(),
    flightType: document.getElementById("pdfFlightType").value,
    aircraftModel: document.getElementById("pdfAircraftModel").value.trim(),
    aircraftRequired: Number(document.getElementById("pdfAircraftRequired").value),
    aircraftAssigned: [],
    flightHoursAvailable: document.getElementById("pdfFlightHours").value.trim(),
    requirements: {
      armament: document.getElementById("pdfReqArmament").checked,
      winch: document.getElementById("pdfReqWinch").checked,
      hook: document.getElementById("pdfReqHook").checked,
      ifr: document.getElementById("pdfReqIfr").checked,
      ovn: document.getElementById("pdfReqOvn").checked,
      restrictedArea: document.getElementById("pdfReqRestrictedArea").checked,
      medevac: document.getElementById("pdfReqMedevac").checked,
      paradrop: document.getElementById("pdfReqParadrop").checked,
      aerialShooting: document.getElementById("pdfReqAerialShooting").checked,
    },
    operationDetails,
    contactName: document.getElementById("pdfContactName").value.trim(),
    contactRole: document.getElementById("pdfContactRole").value.trim(),
    contactPhone: document.getElementById("pdfContactPhone").value.trim(),
    notes,
    details: [...operationDetails, notes].filter(Boolean).join(" · "),
    importSource: state.pendingImportedMission?.importSource || {
      type: "pdf",
      importedAt: new Date().toISOString(),
      rawTextPreview: "",
    },
  });
}

function reviewImportedMission(event) {
  event.preventDefault();
  if (!requireCloudEditor("salvar missões importadas de PDF")) return;
  const mission = importedMissionFromReview();
  if (!validateMission(mission)) return;
  const confirmationRequired = document.getElementById("pdfAirUnitConfirmation").classList.contains("visible");
  const airUnitConfirmed = document.getElementById("pdfConfirmAirUnit").checked;
  if (!/1\s*[ªa]\s*EHEG/i.test(mission.airUnit) || (confirmationRequired && !airUnitConfirmed)) {
    return showToast("Confirme que os dados correspondem à 1ª EHEG.");
  }

  state.pendingImportedMission = mission;
  state.similarMissions = findSimilarMissions(mission, state.missions);
  els.pdfReviewDialog.close();
  if (!state.similarMissions.length) {
    saveImportedAsNew();
    return;
  }
  fillDuplicateCandidates();
  els.duplicateDialog.showModal();
}

function comparableText(value) {
  return normalizeComparableText(value)
    .toLowerCase();
}

function normalizeComparableText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function documentNumber(value, type) {
  const pattern = type === "oma"
    ? /OMA\s*(?:NR|N[ºO])?\.?\s*(\d{2,4}[./-]\d{2,4})/i
    : /O\s*FRAG\s*(?:NR|N[ºO])?\.?\s*(\d{2,4}[./-]\d{2,4})/i;
  const normalized = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return normalized.match(pattern)?.[1]?.replace(/[/-]/g, ".") || "";
}

function textSimilarity(a, b) {
  const tokensA = new Set(comparableText(a).split(" ").filter((token) => token.length > 2));
  const tokensB = new Set(comparableText(b).split(" ").filter((token) => token.length > 2));
  if (!tokensA.size || !tokensB.size) return 0;
  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  return intersection / new Set([...tokensA, ...tokensB]).size;
}

function findSimilarMissions(importedMission, existingMissions) {
  const importedReference = documentNumber(importedMission.reference, "oma");
  const importedSource = documentNumber(importedMission.sourceDocument, "ofrag");
  return existingMissions
    .map((existing) => {
      let score = 0;
      const reasons = [];
      const existingReference = documentNumber(existing.reference, "oma");
      const existingSource = documentNumber(existing.sourceDocument, "ofrag");
      const overlaps = rangesOverlap(importedMission.startDate, importedMission.endDate, existing.startDate, existing.endDate);
      const troopSimilarity = textSimilarity(importedMission.supportedTroop, existing.supportedTroop);
      const locationSimilarity = textSimilarity(importedMission.location, existing.location);
      const nameSimilarity = textSimilarity(importedMission.name, existing.name);

      if (importedReference && importedReference === existingReference) {
        score += 100;
        reasons.push("mesma referência OMA");
      }
      if (importedSource && importedSource === existingSource) {
        score += 95;
        reasons.push("mesmo número de O Frag");
      }
      if (overlaps && troopSimilarity >= 0.45) {
        score += 60;
        reasons.push("período sobreposto e tropa apoiada parecida");
      }
      if (overlaps && locationSimilarity >= 0.4) {
        score += 50;
        reasons.push("período sobreposto e localização parecida");
      }
      if (nameSimilarity >= 0.5) {
        score += 35;
        reasons.push("nome parecido");
      }
      return { mission: existing, score, reasons };
    })
    .filter((candidate) => candidate.score >= 35)
    .sort((a, b) => b.score - a.score);
}

window.findSimilarMissions = findSimilarMissions;

function fillDuplicateCandidates() {
  els.duplicateCandidateSelect.innerHTML = state.similarMissions
    .map((candidate) => `<option value="${candidate.mission.id}">${escapeHtml(candidate.mission.name)} · ${candidate.score} pontos</option>`)
    .join("");
  document.getElementById("duplicateCandidateLabel").hidden = state.similarMissions.length === 1;
  renderDuplicateComparison();
}

function renderDuplicateComparison() {
  const selectedId = els.duplicateCandidateSelect.value || state.similarMissions[0]?.mission.id;
  const candidate = state.similarMissions.find((item) => item.mission.id === selectedId) || state.similarMissions[0];
  if (!candidate || !state.pendingImportedMission) return;
  els.existingMissionComparison.innerHTML = comparisonMarkup(candidate.mission);
  els.importedMissionComparison.innerHTML = comparisonMarkup(state.pendingImportedMission);
  els.duplicateReasons.textContent = `Sinais encontrados: ${candidate.reasons.join("; ")}. Ao atualizar, o ID, as aeronaves já designadas e as observações anteriores serão preservados.`;
  const updateButton = document.getElementById("updateExistingMissionButton");
  if (candidate.mission.status === "cancelled") {
    updateButton.textContent = "Reativar e atualizar";
    els.duplicateReasons.textContent = `Esta missão parece já existir, mas está marcada como cancelada. Ao reativar e atualizar, o ID, as aeronaves já designadas e as observações anteriores serão preservados.`;
  } else {
    updateButton.textContent = "Atualizar missão existente";
  }
}

function comparisonMarkup(mission) {
  const rows = [
    ["Status", mission.status === "cancelled" ? "Cancelada" : "Ativa"],
    ["Nome", mission.name || "Não identificado"],
    ["Referência", mission.reference || "Não identificada"],
    ["O Frag", mission.sourceDocument || "Não identificado"],
    ["Período", `${formatDate(mission.startDate)} a ${formatDate(mission.endDate)}`],
    ["Local", mission.location || "Não identificado"],
    ["Aeronaves", `${mission.aircraftRequired || "?"} ${mission.aircraftModel || ""}`.trim()],
    ["Designadas", aircraftNumbers(mission).join(", ") || "Nenhuma"],
    ["HDV", mission.flightHoursAvailable || "Não identificado"],
    ["Detalhes", mission.details || mission.operationDetails?.join(" · ") || "Não identificados"],
  ];
  return rows.map(([label, value]) => `<div class="comparison-row"><strong>${label}</strong><span>${escapeHtml(value)}</span></div>`).join("");
}

function saveImportedAsNew() {
  if (!requireCloudEditor("cadastrar missões importadas")) return;
  if (!state.pendingImportedMission) return;
  const mission = {
    ...state.pendingImportedMission,
    id: uid("mission"),
    aircraftAssigned: [],
  };
  upsertMission(mission);
  finishPdfImport("Missão importada e cadastrada.");
}

function updateMissionFromImport() {
  if (!requireCloudEditor("atualizar missões importadas")) return;
  if (!state.pendingImportedMission) return;
  const selectedId = els.duplicateCandidateSelect.value || state.similarMissions[0]?.mission.id;
  const existing = state.missions.find((mission) => mission.id === selectedId);
  if (!existing) return showToast("Missão existente não encontrada.");

  const imported = state.pendingImportedMission;
  const retainedAssignments = [...existing.aircraftAssigned];
  const importedRequired = Math.max(imported.aircraftRequired, retainedAssignments.length);
  const mergedNotes = mergeNotes(existing.notes || existing.details, imported.notes);
  const mergedOperationDetails = imported.operationDetails.length ? imported.operationDetails : existing.operationDetails;
  const merged = normalizeMission({
    ...existing,
    ...Object.fromEntries(Object.entries(imported).filter(([, value]) => value !== "" && value !== null && value !== undefined)),
    id: existing.id,
    aircraftRequired: importedRequired,
    aircraftAssigned: retainedAssignments,
    operationDetails: mergedOperationDetails,
    notes: mergedNotes,
    details: [...mergedOperationDetails, mergedNotes].filter(Boolean).join(" · "),
    status: existing.status === "cancelled" ? "planned" : existing.status,
  });
  if (existing.status === "cancelled") {
    const conflicts = reactivationConflicts(merged);
    if (conflicts.length) {
      state.pendingPdfMergedMission = merged;
      els.duplicateDialog.close();
      els.statusDialogTitle.textContent = "Reativar e atualizar missão";
      els.statusDialogBody.innerHTML = `
        <p>Esta missão cancelada possui aeronaves que agora estão em conflito com outras missões ativas.</p>
        <div class="conflict-list">${conflicts.map((conflict) => `
          <div><strong>Aeronave ${escapeHtml(conflict.aircraftNumber)}</strong><span>Conflito com ${escapeHtml(conflict.missionName)} de ${formatDate(conflict.startDate)} a ${formatDate(conflict.endDate)}</span></div>
        `).join("")}</div>
      `;
      els.statusDialogActions.innerHTML = `
        <button class="secondary-button" type="button" onclick="cancelPdfImport()">Cancelar importação</button>
        <button class="danger-outline-button" type="button" onclick="finalizePdfMissionUpdate(false)">Reativar e manter aeronaves</button>
        <button class="primary-button" type="button" onclick="finalizePdfMissionUpdate(true)">Reativar removendo conflitos</button>
      `;
      els.statusDialog.showModal();
      return;
    }
  }
  finalizePdfMissionUpdate(false, merged, existing.status === "cancelled");
}

function finalizePdfMissionUpdate(removeConflicts, missionOverride = null, reactivated = true) {
  const merged = missionOverride || state.pendingPdfMergedMission;
  if (!merged) return;
  const conflicts = reactivationConflicts(merged);
  if (removeConflicts) {
    const conflictingIds = new Set(conflicts.map((conflict) => conflict.aircraftId));
    merged.aircraftAssigned = merged.aircraftAssigned.filter((aircraftId) => !conflictingIds.has(aircraftId));
  }
  upsertMission(merged);
  state.pendingPdfMergedMission = null;
  if (els.statusDialog.open) els.statusDialog.close();
  finishPdfImport(`Missão existente atualizada${reactivated ? " e reativada" : ""}.${removeConflicts && conflicts.length ? " Aeronaves conflitantes foram removidas." : ""}`);
}

function mergeNotes(existingNotes, importedNotes) {
  const existing = String(existingNotes || "").trim();
  const imported = String(importedNotes || "").trim();
  if (!existing) return imported;
  if (!imported || comparableText(existing).includes(comparableText(imported))) return existing;
  return `${existing}\n\nImportação PDF: ${imported}`;
}

function cancelPdfImport() {
  if (els.pdfReviewDialog.open) els.pdfReviewDialog.close();
  if (els.duplicateDialog.open) els.duplicateDialog.close();
  if (els.statusDialog.open) els.statusDialog.close();
  state.pendingPdfFile = null;
  state.pendingImportedMission = null;
  state.pendingPdfMergedMission = null;
  state.similarMissions = [];
  document.getElementById("pdfImportInput").value = "";
  document.getElementById("processPdfButton").disabled = true;
  els.pdfImportStatus.textContent = "Nenhum arquivo selecionado.";
}

function finishPdfImport(message) {
  cancelPdfImport();
  renderAll();
  showView("missionsView");
  showToast(message);
}

function loadSheetConfigForm() {
  const config = state.sheetConfig;
  const values = {
    sheetDisplayName: config.displayName,
    sheetSpreadsheetId: config.spreadsheetId,
    sheetName: config.sheetName,
    sheetRange: config.range,
    sheetReferenceYear: config.referenceYear,
    sheetAccessMode: config.accessMode,
    sheetGoogleClientId: config.googleClientId,
    sheetSyncFrequency: config.syncFrequency,
    sheetDailyBlockingMode: config.dailyBlockingMode,
  };
  Object.entries(values).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) input.value = value ?? "";
  });
  document.getElementById("sheetAutoSyncEnabled").checked = !!config.autoSyncEnabled;
  renderSheetSyncStatus();
}

function sheetConfigFromForm() {
  return {
    displayName: document.getElementById("sheetDisplayName").value.trim() || "Planejamento de Missões",
    spreadsheetId: document.getElementById("sheetSpreadsheetId").value.trim(),
    sheetName: document.getElementById("sheetName").value.trim() || "MISSÕES",
    range: document.getElementById("sheetRange").value.trim() || "A:J",
    referenceYear: Number(document.getElementById("sheetReferenceYear").value || 2026),
    accessMode: document.getElementById("sheetAccessMode").value,
    googleClientId: document.getElementById("sheetGoogleClientId").value.trim(),
    autoSyncEnabled: document.getElementById("sheetAutoSyncEnabled").checked,
    syncFrequency: document.getElementById("sheetSyncFrequency").value,
    dailyBlockingMode: document.getElementById("sheetDailyBlockingMode").value,
    lastSyncedAt: state.sheetConfig.lastSyncedAt || "",
  };
}

function saveSheetConfig(event) {
  event.preventDefault();
  if (!requireCloudEditor("alterar configuração do Google Sheets")) return;
  state.sheetConfig = sheetConfigFromForm();
  persist();
  renderSheetSyncStatus();
  showToast("Configuração do Google Sheets salva.");
}

function renderSheetSyncStatus() {
  if (!els.sheetSyncStatus) return;
  const last = state.sheetConfig.lastSyncedAt
    ? `Última atualização: ${formatDateTime(state.sheetConfig.lastSyncedAt)}.`
    : "Google Sheets não sincronizado nesta sessão.";
  els.sheetSyncStatus.textContent = `${last} Fonte: ${state.sheetConfig.displayName} · aba ${state.sheetConfig.sheetName}.`;
  els.sheetSyncHistory.innerHTML = state.syncHistory.slice(-5).reverse().map((item) => `
    <div class="sync-history-item">
      <strong>${formatDateTime(item.timestamp)}</strong>
      <span>${item.rowsRead} linhas · ${item.created} novas · ${item.updated} atualizadas · ${item.review} em revisão · ${item.errors} erro(s)</span>
    </div>
  `).join("");
}

async function testSheetConnection() {
  state.sheetConfig = sheetConfigFromForm();
  els.sheetSyncStatus.textContent = "Testando acesso ao Google Sheets...";
  try {
    const rows = await fetchGoogleSheetRows();
    els.sheetSyncStatus.textContent = `Conexão OK. ${rows.length} linha(s) lida(s) da aba ${state.sheetConfig.sheetName}.`;
    showToast("Conexão com Google Sheets confirmada.");
  } catch (error) {
    els.sheetSyncStatus.textContent = `Erro na leitura: ${error.message}`;
    showToast("Não foi possível ler a planilha.");
  }
}

async function syncGoogleSheetMissions() {
  if (!requireCloudEditor("sincronizar missões do Google Sheets")) return;
  state.sheetConfig = sheetConfigFromForm();
  els.sheetSyncStatus.textContent = "Lendo Google Sheets...";
  try {
    const startedAt = Date.now();
    const rawRows = await fetchGoogleSheetRows();
    const normalizedRows = fillDownDatesWithinMissionBlock(fillDownMergedValues(rawRows));
    const groups = groupMissionRows(normalizedRows);
    const sheetMissions = groups.map((group) => buildMissionFromRowGroup(group)).filter(Boolean);
    const review = reviewMissionSync(sheetMissions, rawRows, startedAt);
    state.pendingSheetSync = review;
    renderSheetSyncReview(review);
    els.sheetSyncDialog.showModal();
    els.sheetSyncStatus.textContent = `Leitura concluída. ${sheetMissions.length} missão(ões) encontradas para revisão.`;
  } catch (error) {
    els.sheetSyncStatus.textContent = `Erro na leitura: ${error.message}`;
    showToast("Falha ao sincronizar Google Sheets.");
  }
}

async function fetchGoogleSheetRows() {
  const config = state.sheetConfig;
  if (!config.spreadsheetId) throw new Error("Informe o ID da planilha.");
  if (config.accessMode === "google-api") {
    return fetchGoogleSheetRowsWithApi(config);
  }
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.sheetName)}&range=${encodeURIComponent(config.range || "A:J")}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Sem acesso público. Altere o modo para Conta Google e informe um Client ID com permissão somente leitura.");
    }
    throw new Error(`Google Sheets respondeu ${response.status}. Verifique permissões da planilha.`);
  }
  const csv = await response.text();
  return csvToMissionRows(parseCsv(csv));
}

async function fetchGoogleSheetRowsWithApi(config) {
  if (!config.googleClientId) throw new Error("Informe o Client ID Google para usar planilha privada.");
  const token = await getGoogleSheetsAccessToken(config.googleClientId);
  const range = `${encodeURIComponent(config.sheetName)}!${encodeURIComponent(config.range || "A:J")}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${range}?valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Autenticação Google expirada ou recusada.");
    if (response.status === 403) throw new Error("Conta Google sem permissão de leitura nesta planilha.");
    throw new Error(`Google Sheets API respondeu ${response.status}.`);
  }
  const payload = await response.json();
  return csvToMissionRows(payload.values || []);
}

async function getGoogleSheetsAccessToken(clientId) {
  await loadGoogleIdentityServices();
  return new Promise((resolve, reject) => {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        callback: (response) => {
          if (response?.access_token) resolve(response.access_token);
          else reject(new Error(response?.error || "Login Google não concluído."));
        },
        error_callback: () => reject(new Error("Não foi possível autenticar com Google.")),
      });
      tokenClient.requestAccessToken({ prompt: "" });
    } catch (error) {
      reject(error);
    }
  });
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Identity Services não carregou.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google Identity Services não carregou."));
    document.head.appendChild(script);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const input = String(text || "").replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        value += "\"";
        index += 1;
      } else if (char === "\"") quoted = false;
      else value += char;
    } else if (char === "\"") quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") value += char;
  }
  row.push(value);
  rows.push(row);
  return rows;
}

function csvToMissionRows(rows) {
  return rows.map((columns, index) => ({
    sourceRow: index + 1,
    rawMission: normalizeSheetCellValue(columns[0]),
    rawLocal: normalizeSheetCellValue(columns[1]),
    rawDate: normalizeSheetCellValue(columns[2]),
    rawHv: normalizeSheetCellValue(columns[3]),
    rawAircraft: normalizeAircraftNumber(columns[4]),
    po: normalizeSheetCellValue(columns[5]),
    poPt: normalizeSheetCellValue(columns[6]),
    pt: normalizeSheetCellValue(columns[7]),
    mv: normalizeSheetCellValue(columns[8]),
    rawOvernights: normalizeSheetCellValue(columns[9]),
  })).filter((row) => !isSheetHeaderRow(row));
}

function normalizeSheetCellValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeAircraftNumber(value) {
  return normalizeSheetCellValue(value);
}

function isSheetHeaderRow(row) {
  const mission = normalizeComparableText(row.rawMission);
  const date = normalizeComparableText(row.rawDate);
  return mission === "MISSAO" || date === "DATA";
}

function fillDownMergedValues(rows) {
  let mission = "";
  let local = "";
  let hv = "";
  return rows.map((row) => {
    if (isCompletelyEmptySheetRow(row)) {
      mission = "";
      local = "";
      hv = "";
      return { ...row, mission: "", local: "", hv: "" };
    }
    if (row.rawMission) mission = row.rawMission;
    if (row.rawLocal) local = row.rawLocal;
    if (row.rawHv) hv = row.rawHv;
    return {
      ...row,
      mission: row.rawMission || mission,
      local: row.rawLocal || local,
      hv: row.rawHv || hv,
    };
  });
}

function fillDownDatesWithinMissionBlock(rows) {
  let currentMission = "";
  let lastDate = "";
  return rows.map((row) => {
    if (!row.mission) {
      currentMission = "";
      lastDate = "";
      return row;
    }
    if (row.rawMission && row.mission !== currentMission) {
      currentMission = row.mission;
      lastDate = "";
    }
    if (row.rawDate) lastDate = row.rawDate;
    return {
      ...row,
      date: row.rawDate || lastDate,
    };
  });
}

function isCompletelyEmptySheetRow(row) {
  return ["rawMission", "rawLocal", "rawDate", "rawHv", "rawAircraft", "po", "poPt", "pt", "mv", "rawOvernights"]
    .every((key) => !row[key]);
}

function groupMissionRows(rows) {
  const groups = [];
  let current = null;

  rows.forEach((row) => {
    if (!row.mission || isCompletelyEmptySheetRow(row)) {
      current = null;
      return;
    }
    const repeatsCurrentMission = current && normalizeComparableText(row.mission) === normalizeComparableText(current.name);
    if (!current || (row.rawMission && !repeatsCurrentMission)) {
      current = {
        name: row.mission,
        local: row.local,
        rows: [],
        sourceRowStart: row.sourceRow,
        sourceRowEnd: row.sourceRow,
      };
      groups.push(current);
    }
    current.rows.push(row);
    current.sourceRowEnd = row.sourceRow;
  });

  return groups;
}

function buildMissionFromRowGroup(group) {
  const rows = group.rows;
  const referenceYear = Number(state.sheetConfig.referenceYear || 2026);
  const parsedRows = rows.map((row) => ({
    ...row,
    parsedDate: parsePortugueseDateOrRange(row.date, referenceYear),
  }));
  const validRanges = parsedRows.map((row) => row.parsedDate).filter(Boolean);
  const startDate = minIso(validRanges.map((range) => range.startDate));
  const endDate = maxIso(validRanges.map((range) => range.endDate));
  if (!startDate || !endDate) return null;

  const hv = parseSheetFlightHours(rows.find((row) => row.hv)?.hv || "");
  const aircraftSchedule = buildAircraftSchedule(parsedRows);
  const crewSchedule = buildCrewSchedule(parsedRows);
  const dailyPlanning = buildDailyPlanning(aircraftSchedule, crewSchedule);
  const aircraftAssigned = uniqueValues(dailyPlanning.flatMap((day) => day.aircraftAssigned || []));
  const peak = calculatePeakAircraftDemand(dailyPlanning);
  const locations = buildLocationEntries(parsedRows);
  const locationSummary = uniqueValues(locations.map((item) => item.location || "").filter(Boolean)).join("; ") || group.local || "";
  const normalizedName = normalizeComparableText(group.name);
  const normalizedLocation = normalizeComparableText(locationSummary);
  const overnights = parseSheetOvernights(rows);
  const sourceMissionKey = `${normalizedName}|${normalizedLocation}|${startDate}|${endDate}`;
  const duplicateAircraftWarnings = findDuplicateAircraftWarnings(parsedRows, group.name);

  return normalizeMission({
    id: uid("mission"),
    name: group.name,
    normalizedName,
    location: locationSummary,
    locationEntries: locations,
    startDate,
    endDate,
    flightType: extractSheetTags(group.name).includes("OVN") ? "OVN" : "VFR",
    aircraftRequired: peak || 0,
    aircraftRequiredSource: peak ? "sheet-daily-peak" : "not-identified",
    aircraftQuantitySource: peak ? "sheet" : "not-identified",
    aircraftAssigned,
    aircraftSchedule,
    crewSchedule,
    dailyPlanning,
    scheduleEntries: parsedRows.map((row) => ({
      sourceRow: row.sourceRow,
      rawDate: row.rawDate,
      date: row.date,
      startDate: row.parsedDate?.startDate || "",
      endDate: row.parsedDate?.endDate || "",
    })),
    unresolvedRows: parsedRows
      .filter((row) => row.rawAircraft && !row.parsedDate)
      .map((row) => ({ sourceRow: row.sourceRow, reason: "Data não identificada", aircraft: row.rawAircraft })),
    duplicateAircraftWarnings,
    flightHoursAvailable: hv.value,
    flightHoursDisplay: hv.display,
    flightHoursRaw: hv.raw,
    requirements: { armament: false, winch: false, hook: false, ovn: extractSheetTags(group.name).includes("OVN") },
    tags: extractSheetTags(group.name),
    declaredDateRange: validRanges[0] || null,
    overnights: overnights.total,
    overnightSchedule: overnights.schedule,
    status: "planned",
    source: "google-sheets",
    sourceSheetName: state.sheetConfig.sheetName,
    sourceRowStart: group.sourceRowStart,
    sourceRowEnd: group.sourceRowEnd,
    sourceMissionKey,
    lastSyncedAt: new Date().toISOString(),
    fieldSources: {
      name: "google-sheets",
      location: "google-sheets",
      startDate: "google-sheets",
      endDate: "google-sheets",
      dailyPlanning: "google-sheets",
      aircraftAssigned: "google-sheets",
      aircraftRequired: peak ? "google-sheets" : "not-identified",
      flightHoursAvailable: "google-sheets",
    },
    details: "",
  });
}

function parsePortugueseDateOrRange(value, referenceYear = 2026) {
  const raw = normalizeSheetCellValue(value);
  if (!raw || raw === "-") return null;
  const serial = Number(raw.replace(",", "."));
  if (/^\d{5,}$/.test(raw) && serial > 30000) {
    const date = new Date(Date.UTC(1899, 11, 30 + serial));
    const iso = toIsoDate(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return { startDate: iso, endDate: iso, dates: [iso], raw };
  }

  const numeric = raw.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (numeric) {
    const year = normalizeYear(numeric[3] || referenceYear);
    const iso = makeIso(year, Number(numeric[2]), Number(numeric[1]));
    return { startDate: iso, endDate: iso, dates: [iso], raw };
  }

  const text = normalizeComparableText(raw).replace(/\bA\b/g, " A ");
  const crossMonth = text.match(/^(\d{1,2})\s+([A-Z]{3,9})\s+A\s+(\d{1,2})\s+([A-Z]{3,9})(?:\s+(\d{2,4}))?$/);
  const sameMonth = text.match(/^(\d{1,2})\s+A\s+(\d{1,2})\s+([A-Z]{3,9})(?:\s+(\d{2,4}))?$/);
  const single = text.match(/^(\d{1,2})\s+([A-Z]{3,9})(?:\s+(\d{2,4}))?$/);

  if (crossMonth) {
    const year = normalizeYear(crossMonth[5] || referenceYear);
    const start = makeIso(year, monthNumber(crossMonth[2]), Number(crossMonth[1]));
    const end = makeIso(year, monthNumber(crossMonth[4]), Number(crossMonth[3]));
    return { startDate: start, endDate: end, dates: dateRange(start, end), raw };
  }
  if (sameMonth) {
    const year = normalizeYear(sameMonth[4] || referenceYear);
    const month = monthNumber(sameMonth[3]);
    const start = makeIso(year, month, Number(sameMonth[1]));
    const end = makeIso(year, month, Number(sameMonth[2]));
    return { startDate: start, endDate: end, dates: dateRange(start, end), raw };
  }
  if (single) {
    const year = normalizeYear(single[3] || referenceYear);
    const iso = makeIso(year, monthNumber(single[2]), Number(single[1]));
    return { startDate: iso, endDate: iso, dates: [iso], raw };
  }
  return null;
}

function monthNumber(monthText) {
  const months = {
    JAN: 1, JANEIRO: 1,
    FEV: 2, FEVEREIRO: 2,
    MAR: 3, MARCO: 3, MARÇO: 3,
    ABR: 4, ABRIL: 4,
    MAI: 5, MAIO: 5,
    JUN: 6, JUNHO: 6,
    JUL: 7, JULHO: 7,
    AGO: 8, AGOSTO: 8,
    SET: 9, SETEMBRO: 9,
    OUT: 10, OUTUBRO: 10,
    NOV: 11, NOVEMBRO: 11,
    DEZ: 12, DEZEMBRO: 12,
  };
  return months[normalizeComparableText(monthText)] || 1;
}

function normalizeYear(year) {
  const value = Number(year);
  return value < 100 ? 2000 + value : value;
}

function makeIso(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildAircraftSchedule(rows) {
  const byDate = new Map();
  rows.forEach((row) => {
    if (!row.rawAircraft || !row.parsedDate) return;
    row.parsedDate.dates.forEach((date) => {
      if (!byDate.has(date)) byDate.set(date, new Set());
      byDate.get(date).add(row.rawAircraft);
    });
  });
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, aircraft]) => ({ date, aircraft: [...aircraft] }));
}

function buildCrewSchedule(rows) {
  const schedule = [];
  rows.forEach((row) => {
    if (!row.parsedDate || !(row.rawAircraft || row.po || row.poPt || row.pt || row.mv)) return;
    row.parsedDate.dates.forEach((date) => {
      schedule.push({
        date,
        aircraft: row.rawAircraft,
        po: row.po,
        poRaw: row.po,
        poPt: row.poPt,
        poPtRaw: row.poPt,
        pt: row.pt,
        ptRaw: row.pt,
        mv: row.mv,
        mvRaw: row.mv,
        sourceRow: row.sourceRow,
      });
    });
  });
  return schedule;
}

function buildDailyPlanning(aircraftSchedule, crewSchedule) {
  const crewByDate = new Map();
  crewSchedule.forEach((crew) => {
    if (!crewByDate.has(crew.date)) crewByDate.set(crew.date, []);
    crewByDate.get(crew.date).push(crew);
  });
  return aircraftSchedule.map((entry) => ({
    date: entry.date,
    aircraftRequired: entry.aircraft.length,
    aircraftAssigned: entry.aircraft,
    crews: crewByDate.get(entry.date) || [],
    quantitySource: "sheet-aircraft-count",
  }));
}

function calculatePeakAircraftDemand(dailyPlanning) {
  return dailyPlanning.reduce((max, day) => Math.max(max, Number(day.aircraftRequired || 0)), 0);
}

function buildLocationEntries(rows) {
  const entries = [];
  rows.forEach((row) => {
    if (!row.local) return;
    const dates = row.parsedDate?.dates?.length ? row.parsedDate.dates : [""];
    dates.forEach((date) => {
      const entry = { date, location: row.local, sourceRow: row.sourceRow };
      if (!entries.some((item) => item.date === entry.date && item.location === entry.location)) entries.push(entry);
    });
  });
  return entries;
}

function parseSheetFlightHours(value) {
  const raw = normalizeSheetCellValue(value);
  if (!raw) return { value: "", display: "", raw: "" };
  const numeric = raw.match(/^\d+(?:[,.]\d+)?$/);
  if (!numeric) return { value: null, display: raw, raw };
  const valueNumber = Number(raw.replace(",", "."));
  return { value: String(valueNumber), display: raw, raw };
}

function parseSheetOvernights(rows) {
  const values = rows.map((row) => row.rawOvernights).filter((value) => value !== "");
  const unique = uniqueValues(values);
  return {
    total: unique.length === 1 ? unique[0] : "",
    schedule: rows
      .filter((row) => row.rawOvernights !== "")
      .map((row) => ({ sourceRow: row.sourceRow, date: row.date || "", value: row.rawOvernights })),
  };
}

function extractSheetTags(name) {
  const allowed = new Set(["INF", "EXF", "ALE", "OVN", "RAP", "GUI", "CAM", "PQD", "PREC", "SAR", "REC", "SIESP"]);
  return [...normalizeComparableText(name).matchAll(/\b[A-Z]{2,6}\b/g)]
    .map((match) => match[0])
    .filter((tag) => allowed.has(tag));
}

function findDuplicateAircraftWarnings(rows, missionName) {
  const seen = new Map();
  const warnings = [];
  rows.forEach((row) => {
    if (!row.rawAircraft || !row.parsedDate) return;
    row.parsedDate.dates.forEach((date) => {
      const key = `${date}|${row.rawAircraft}`;
      if (seen.has(key)) {
        warnings.push({
          missionName,
          date,
          aircraft: row.rawAircraft,
          sourceRows: [seen.get(key), row.sourceRow],
          message: `O numeral ${row.rawAircraft} aparece mais de uma vez em ${formatDate(date)}.`,
        });
      } else seen.set(key, row.sourceRow);
    });
  });
  return warnings;
}

function reviewMissionSync(sheetMissions, rawRows, startedAt) {
  const items = sheetMissions.map((sheetMission) => {
    const match = findSimilarExistingMission(sheetMission, state.missions);
    const changes = match?.mission ? compareSheetMissionWithAppMission(sheetMission, match.mission) : [];
    const action = !match
      ? "create"
      : match.score >= 85 && match.mission.status !== "cancelled"
        ? "update"
        : "review";
    return { sheetMission, match, changes, action, selected: action !== "review" };
  });
  return {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    rowsRead: rawRows.length,
    items,
    ignoredRows: rawRows.filter((row) => !row.rawMission && !row.rawAircraft && !row.rawDate).length,
    errors: sheetMissions.flatMap((mission) => mission.unresolvedRows || []),
    duplicateAircraftWarnings: sheetMissions.flatMap((mission) => mission.duplicateAircraftWarnings || []),
  };
}

function findSimilarExistingMission(sheetMission, existingMissions) {
  const candidates = existingMissions.map((mission) => {
    let score = 0;
    const reasons = [];
    if (mission.sheetBindingId && state.sheetBindings.some((binding) =>
      binding.localMissionId === mission.id
      && binding.spreadsheetId === state.sheetConfig.spreadsheetId
      && binding.lastKnownMissionKey === sheetMission.sourceMissionKey
    )) {
      score += 100;
      reasons.push("vínculo confirmado");
    }
    if (mission.sourceMissionKey && mission.sourceMissionKey === sheetMission.sourceMissionKey) {
      score += 95;
      reasons.push("mesmo identificador da planilha");
    }
    if (normalizeComparableText(mission.name) === sheetMission.normalizedName) score += 40;
    if (mission.startDate === sheetMission.startDate && mission.endDate === sheetMission.endDate) score += 30;
    else if (rangesOverlap(mission.startDate, mission.endDate, sheetMission.startDate, sheetMission.endDate)) score += 20;
    else score -= 40;
    if (normalizeComparableText(mission.location) === normalizeComparableText(sheetMission.location)) score += 20;
    if (intersectionCount(aircraftNumbers(mission), sheetMission.aircraftAssigned) > 0) score += 10;
    const qualifierA = (mission.name.match(/\(([^)]+)\)/)?.[1] || "").trim();
    const qualifierB = (sheetMission.name.match(/\(([^)]+)\)/)?.[1] || "").trim();
    if (qualifierA && qualifierB && normalizeComparableText(qualifierA) === normalizeComparableText(qualifierB)) score += 15;
    if (qualifierA && qualifierB && normalizeComparableText(qualifierA) !== normalizeComparableText(qualifierB)) score -= 20;
    return { mission, score, reasons };
  }).sort((a, b) => b.score - a.score);
  return candidates.find((candidate) => candidate.score >= 60) || null;
}

function compareSheetMissionWithAppMission(sheetMission, appMission) {
  const changes = [];
  [
    ["name", "Nome"],
    ["location", "Local"],
    ["startDate", "Data inicial"],
    ["endDate", "Data final"],
    ["flightHoursDisplay", "HV"],
  ].forEach(([key, label]) => {
    const from = String(appMission[key] || "");
    const to = String(sheetMission[key] || "");
    if (from !== to && to !== "") changes.push({ field: key, label, from, to });
  });
  const appAircraft = aircraftNumbers(appMission).join(", ");
  const sheetAircraft = sheetMission.aircraftAssigned.join(", ");
  if (appAircraft !== sheetAircraft) changes.push({ field: "aircraftAssigned", label: "Aeronaves", from: appAircraft || "sem numeral", to: sheetAircraft || "sem numeral" });
  if (JSON.stringify(appMission.dailyPlanning || []) !== JSON.stringify(sheetMission.dailyPlanning || [])) {
    changes.push({ field: "dailyPlanning", label: "Programação diária", from: `${appMission.dailyPlanning?.length || 0} dia(s)`, to: `${sheetMission.dailyPlanning.length} dia(s)` });
  }
  return changes;
}

function renderSheetSyncReview(review) {
  const created = review.items.filter((item) => item.action === "create").length;
  const updated = review.items.filter((item) => item.action === "update").length;
  const manual = review.items.filter((item) => item.action === "review").length;
  els.sheetSyncSummary.innerHTML = `
    <div class="sync-summary-grid">
      <div><strong>${review.rowsRead}</strong><span>linhas lidas</span></div>
      <div><strong>${created}</strong><span>novas</span></div>
      <div><strong>${updated}</strong><span>atualizações prováveis</span></div>
      <div><strong>${manual}</strong><span>exigem revisão</span></div>
      <div><strong>${review.errors.length}</strong><span>erros de data</span></div>
      <div><strong>${review.duplicateAircraftWarnings.length}</strong><span>duplicidades de ANV</span></div>
    </div>
  `;
  els.sheetSyncReview.innerHTML = review.items.map((item, index) => sheetSyncItemMarkup(item, index)).join("");
}

function sheetSyncItemMarkup(item, index) {
  const mission = item.sheetMission;
  const pending = Math.max(0, mission.aircraftRequired - mission.aircraftAssigned.length);
  const actionLabel = item.action === "create" ? "Nova missão" : item.action === "update" ? "Atualizar existente" : "Revisar duplicidade";
  return `
    <article class="sheet-sync-item ${item.action === "review" ? "sync-item-review" : ""}">
      <label class="check-row">
        <input class="sheet-sync-select" type="checkbox" data-sync-index="${index}" ${item.selected ? "checked" : ""} ${item.action === "review" ? "" : ""} />
        <strong>${escapeHtml(actionLabel)} · ${escapeHtml(mission.name)}</strong>
      </label>
      <div class="item-meta">${formatDate(mission.startDate)} a ${formatDate(mission.endDate)} · ${escapeHtml(mission.location || "sem local")} · ${mission.aircraftRequired || "Qtd"} ANV · ${pending} a definir</div>
      <div class="item-meta">Linhas ${mission.sourceRowStart}–${mission.sourceRowEnd} · ${mission.dailyPlanning.length} dia(s) programado(s) · HV ${escapeHtml(mission.flightHoursDisplay || "não informada")}</div>
      ${item.match ? `<div class="sync-match">Possível correspondência: ${escapeHtml(item.match.mission.name)} · ${item.match.score} pontos</div>` : ""}
      ${item.changes.length ? `<div class="sync-changes">${item.changes.map((change) => `<span>${escapeHtml(change.label)}: ${escapeHtml(change.from || "vazio")} → ${escapeHtml(change.to || "vazio")}</span>`).join("")}</div>` : ""}
      ${mission.unresolvedRows.length ? `<div class="sync-warning">Linhas com data não identificada: ${mission.unresolvedRows.map((row) => row.sourceRow).join(", ")}</div>` : ""}
      ${mission.duplicateAircraftWarnings.length ? `<div class="sync-warning">${mission.duplicateAircraftWarnings.map((warning) => escapeHtml(warning.message)).join("<br>")}</div>` : ""}
    </article>
  `;
}

function applyMissionSync() {
  if (!requireCloudEditor("aplicar sincronização do Google Sheets")) return;
  if (!state.pendingSheetSync) return;
  state.lastSyncBackup = {
    missions: JSON.parse(JSON.stringify(state.missions)),
    sheetBindings: JSON.parse(JSON.stringify(state.sheetBindings)),
    syncHistory: JSON.parse(JSON.stringify(state.syncHistory)),
  };
  const selectedIndexes = [...document.querySelectorAll(".sheet-sync-select")]
    .filter((input) => input.checked)
    .map((input) => Number(input.dataset.syncIndex));
  let created = 0;
  let updated = 0;
  let review = 0;

  selectedIndexes.forEach((index) => {
    const item = state.pendingSheetSync.items[index];
    if (!item) return;
    if (item.action === "create" || !item.match) {
      const createdMission = normalizeMission({ ...item.sheetMission, id: uid("mission") });
      state.missions.push(createdMission);
      saveSheetBinding(createdMission);
      created += 1;
    } else if (item.match.mission.status === "cancelled") {
      review += 1;
    } else {
      const missionIndex = state.missions.findIndex((mission) => mission.id === item.match.mission.id);
      if (missionIndex >= 0) {
        state.missions[missionIndex] = mergeSheetMissionIntoExisting(item.sheetMission, state.missions[missionIndex]);
        saveSheetBinding(state.missions[missionIndex]);
        updated += 1;
      }
    }
  });

  const history = {
    timestamp: new Date().toISOString(),
    rowsRead: state.pendingSheetSync.rowsRead,
    created,
    updated,
    review: review + state.pendingSheetSync.items.filter((item) => item.action === "review").length,
    errors: state.pendingSheetSync.errors.length,
    durationMs: state.pendingSheetSync.durationMs,
  };
  state.syncHistory.push(history);
  state.sheetConfig.lastSyncedAt = history.timestamp;
  state.pendingSheetSync = null;
  persist();
  closeSheetSyncDialog();
  renderAll();
  showToast(`Sincronização aplicada: ${created} nova(s), ${updated} atualizada(s).`);
}

function mergeSheetMissionIntoExisting(sheetMission, existing) {
  const manualRequiredProtected = existing.aircraftRequiredSource === "manual" && existing.aircraftRequired > sheetMission.aircraftRequired;
  const merged = normalizeMission({
    ...existing,
    name: sheetMission.name || existing.name,
    normalizedName: sheetMission.normalizedName || existing.normalizedName,
    location: sheetMission.location || existing.location,
    locationEntries: sheetMission.locationEntries.length ? sheetMission.locationEntries : existing.locationEntries,
    startDate: sheetMission.startDate || existing.startDate,
    endDate: sheetMission.endDate || existing.endDate,
    flightHoursAvailable: sheetMission.flightHoursAvailable !== "" ? sheetMission.flightHoursAvailable : existing.flightHoursAvailable,
    flightHoursDisplay: sheetMission.flightHoursDisplay || existing.flightHoursDisplay,
    flightHoursRaw: sheetMission.flightHoursRaw || existing.flightHoursRaw,
    aircraftAssigned: sheetMission.aircraftAssigned.length ? sheetMission.aircraftAssigned : existing.aircraftAssigned,
    aircraftRequired: manualRequiredProtected ? existing.aircraftRequired : sheetMission.aircraftRequired,
    aircraftRequiredSource: manualRequiredProtected ? existing.aircraftRequiredSource : sheetMission.aircraftRequiredSource,
    aircraftSchedule: sheetMission.aircraftSchedule,
    crewSchedule: sheetMission.crewSchedule,
    dailyPlanning: sheetMission.dailyPlanning,
    scheduleEntries: sheetMission.scheduleEntries,
    unresolvedRows: sheetMission.unresolvedRows,
    duplicateAircraftWarnings: sheetMission.duplicateAircraftWarnings,
    tags: sheetMission.tags,
    overnights: sheetMission.overnights,
    overnightSchedule: sheetMission.overnightSchedule,
    source: "google-sheets",
    sourceSheetName: sheetMission.sourceSheetName,
    sourceRowStart: sheetMission.sourceRowStart,
    sourceRowEnd: sheetMission.sourceRowEnd,
    sourceMissionKey: sheetMission.sourceMissionKey,
    lastSyncedAt: new Date().toISOString(),
    fieldSources: { ...existing.fieldSources, ...sheetMission.fieldSources },
    status: existing.status,
    sourceDocument: existing.sourceDocument,
    reference: existing.reference,
    supportedTroop: existing.supportedTroop,
    airUnit: existing.airUnit,
    contactName: existing.contactName,
    contactRole: existing.contactRole,
    contactPhone: existing.contactPhone,
    notes: existing.notes,
    details: existing.details,
    changeHistory: [
      ...(existing.changeHistory || []),
      { timestamp: new Date().toISOString(), source: "google-sheets", changes: compareSheetMissionWithAppMission(sheetMission, existing) },
    ],
  });
  return merged;
}

function saveSheetBinding(mission) {
  if (!mission.sourceMissionKey) return;
  const existing = state.sheetBindings.find((binding) => binding.localMissionId === mission.id);
  const binding = {
    sheetBindingId: existing?.sheetBindingId || uid("sheet-binding"),
    spreadsheetId: state.sheetConfig.spreadsheetId,
    sheetName: state.sheetConfig.sheetName,
    localMissionId: mission.id,
    lastKnownMissionKey: mission.sourceMissionKey,
    lastKnownRowStart: mission.sourceRowStart,
    lastKnownRowEnd: mission.sourceRowEnd,
  };
  if (existing) Object.assign(existing, binding);
  else state.sheetBindings.push(binding);
  mission.sheetBindingId = binding.sheetBindingId;
}

function undoLastSheetSync() {
  if (!requireCloudEditor("desfazer sincronização")) return;
  if (!state.lastSyncBackup) return showToast("Não há sincronização para desfazer nesta sessão.");
  state.missions = state.lastSyncBackup.missions.map(normalizeMission);
  state.sheetBindings = state.lastSyncBackup.sheetBindings;
  state.syncHistory = state.lastSyncBackup.syncHistory;
  state.lastSyncBackup = null;
  persist();
  renderAll();
  showToast("Última sincronização desfeita.");
}

function closeSheetSyncDialog() {
  if (els.sheetSyncDialog.open) els.sheetSyncDialog.close();
}

function runAutomaticSheetSync() {
  const config = state.sheetConfig;
  if (!config.autoSyncEnabled || config.syncFrequency === "manual") return;
  if (document.getElementById("missionId")?.value) return;
  const minutes = config.syncFrequency === "open" ? 0 : Number(config.syncFrequency);
  if (!minutes) return;
  const last = config.lastSyncedAt ? new Date(config.lastSyncedAt).getTime() : 0;
  if (Date.now() - last < minutes * 60000) return;
  syncGoogleSheetMissions();
}

function minIso(values) {
  return values.filter(Boolean).sort()[0] || "";
}

function maxIso(values) {
  return values.filter(Boolean).sort().at(-1) || "";
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function intersectionCount(valuesA, valuesB) {
  const setB = new Set(valuesB.map((value) => String(value)));
  return valuesA.filter((value) => setB.has(String(value))).length;
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildDate(day, monthText, year) {
  const months = {
    JAN: 0, JANEIRO: 0,
    FEV: 1, FEVEREIRO: 1,
    MAR: 2, MARCO: 2, MARÇO: 2,
    ABR: 3, ABRIL: 3,
    MAI: 4, MAIO: 4,
    JUN: 5, JUNHO: 5,
    JUL: 6, JULHO: 6,
    AGO: 7, AGOSTO: 7,
    SET: 8, SETEMBRO: 8,
    OUT: 9, OUTUBRO: 9,
    NOV: 10, NOVEMBRO: 10,
    DEZ: 11, DEZEMBRO: 11,
  };
  const month = months[monthText.normalize("NFD").replace(/[\u0300-\u036f]/g, "")] ?? 0;
  return toIsoDate(new Date(Number(year), month, Number(day)));
}

function exportBackup() {
  const blob = new Blob([JSON.stringify({
    aircraft: state.aircraft,
    missions: state.missions,
    unavailability: state.unavailability,
    sheetConfig: state.sheetConfig,
    sheetBindings: state.sheetBindings,
    syncHistory: state.syncHistory,
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `backup-planner-aeronaves-${toIsoDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  if (!requireCloudEditor("importar backup")) {
    event.target.value = "";
    return;
  }
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.aircraft) || !Array.isArray(parsed.missions)) throw new Error("Formato inválido");
      state.aircraft = parsed.aircraft;
      state.missions = parsed.missions.map(normalizeMission);
      state.unavailability = Array.isArray(parsed.unavailability) ? parsed.unavailability.map(normalizeUnavailability) : [];
      state.sheetConfig = { ...state.sheetConfig, ...(parsed.sheetConfig || {}) };
      state.sheetBindings = Array.isArray(parsed.sheetBindings) ? parsed.sheetBindings : [];
      state.syncHistory = Array.isArray(parsed.syncHistory) ? parsed.syncHistory : [];
      persist();
      renderAll();
      loadSheetConfigForm();
      showToast("Backup importado.");
    } catch {
      showToast("Arquivo JSON inválido.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function sortedMissions() {
  return [...state.missions].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function missionStatusOrder(mission) {
  return mission.status === "cancelled" ? 1 : 0;
}

function aircraftNumbers(mission) {
  return mission.aircraftAssigned
    .map((id) => aircraftRefNumber(id))
    .filter(Boolean);
}

function aircraftRefNumber(ref) {
  const value = String(ref || "").trim();
  if (!value) return "";
  const aircraft = state.aircraft.find((item) => item.id === value || item.number === value);
  return aircraft?.number || value;
}

function aircraftRefId(ref) {
  const value = String(ref || "").trim();
  if (!value) return "";
  const aircraft = state.aircraft.find((item) => item.id === value || item.number === value);
  return aircraft?.id || value;
}

function aircraftRefMatches(ref, aircraftId) {
  const value = String(ref || "").trim();
  const aircraft = state.aircraft.find((item) => item.id === aircraftId);
  return value === aircraftId || (!!aircraft && value === aircraft.number);
}

function dailyPlanningForDate(mission, date) {
  const iso = typeof date === "string" ? date : toIsoDate(date);
  return Array.isArray(mission.dailyPlanning)
    ? mission.dailyPlanning.find((entry) => entry.date === iso)
    : null;
}

function requirementsLabel(requirements) {
  const labels = [];
  if (requirements.armament) labels.push("Braço de armamento aéreo");
  if (requirements.winch) labels.push("Guincho");
  if (requirements.hook) labels.push("Gancho");
  if (requirements.ifr) labels.push("IFR");
  if (requirements.ovn) labels.push("OVN");
  if (requirements.restrictedArea) labels.push("Área restrita");
  if (requirements.medevac) labels.push("EVA/EVAEM");
  if (requirements.paradrop) labels.push("PQD");
  if (requirements.aerialShooting) labels.push("Tiro embarcado");
  return labels.join(", ") || "Nenhum";
}

function dashboardRequirementTags(mission) {
  const labels = [mission.flightType];
  if (mission.requirements.ifr && mission.flightType !== "IFR") labels.push("IFR");
  if (mission.requirements.ovn && mission.flightType !== "OVN") labels.push("OVN");
  if (mission.requirements.winch) labels.push("Guincho");
  if (mission.requirements.hook) labels.push("Gancho");
  if (mission.requirements.armament) labels.push("Armamento");
  return labels.map((label) => `<span class="tag">${escapeHtml(label)}</span>`).join("");
}

function dashboardMetric(label, value, tone = "") {
  return `
    <article class="dashboard-metric ${tone ? `dashboard-metric-${tone}` : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function parseFlightHours(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  const colonMatch = text.match(/(\d{1,3}):(\d{2})/);
  if (colonMatch) return Number(colonMatch[1]) + Number(colonMatch[2]) / 60;
  const number = text.match(/\d+(?:[,.]\d+)?/);
  return number ? Number(number[0].replace(",", ".")) || 0 : 0;
}

function formatFlightHourTotal(value) {
  if (!value) return "0 HV";
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",")} HV`;
}

function parseIsoDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

function dateRange(startDate, endDate) {
  const days = [];
  let current = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  while (current <= end) {
    days.push(toIsoDate(current));
    current = addDays(current, 1);
  }
  return days;
}

function formatWeekRange(startDate, endDate) {
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(parseIsoDate(endDate)).replace(".", "").toUpperCase();
  const start = parseIsoDate(startDate).getDate();
  const end = parseIsoDate(endDate).getDate();
  const year = parseIsoDate(endDate).getFullYear();
  return `${String(start).padStart(2, "0")} a ${String(end).padStart(2, "0")} ${month} ${year}`;
}

function formatShortWeekday(iso) {
  const date = parseIsoDate(iso);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "").toUpperCase();
  return `${weekday} ${String(date.getDate()).padStart(2, "0")}`;
}

function refreshDashboardIfDateChanged() {
  const today = toIsoDate(new Date());
  if (today === state.dashboardDate) return;
  if (state.dashboardReferenceDate === state.dashboardDate) {
    state.dashboardReferenceDate = today;
  }
  state.dashboardDate = today;
  renderAll();
}

function dateDiffInDays(startDate, endDate) {
  return Math.round((parseIsoDate(endDate) - parseIsoDate(startDate)) / 86400000);
}

function shortMissionName(name) {
  const cleaned = String(name || "Missão").replace(/^miss[aã]o\s+/i, "").trim();
  return cleaned.length > 22 ? `${cleaned.slice(0, 21).trim()}...` : cleaned;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("visible"), 2400);
}
