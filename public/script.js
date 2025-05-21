document.addEventListener("DOMContentLoaded", () => {
  // Globale Referenzen
  const prevWeekBtn = document.getElementById("prev-week");
  const nextWeekBtn = document.getElementById("next-week");
  const weekDisplay = document.getElementById("week-display");
  const requestsList = document.getElementById("requests-list");
  const confirmedList = document.getElementById("confirmed-list");
  const newRequestSystemSelect = document.getElementById("new-request-system"); // NEU
  const filterSystemRequestsSelect = document.getElementById(
    "filter-system-requests"
  ); // NEU
  const filterSystemConfirmedSelect = document.getElementById(
    "filter-system-confirmed"
  ); // NEU

  // Referenzen für das Inline-Formular zum Hinzufügen
  const addRequestBtn = document.getElementById("add-request-btn");
  const addRequestForm = document.getElementById("add-request-form");
  const newRequestNameInput = document.getElementById("new-request-name");
  const submitRequestBtn = document.getElementById("submit-request-btn");
  const cancelRequestBtn = document.getElementById("cancel-request-btn");
  const addRequestError = document.getElementById("add-request-error");

  // Referenzen für das "Annehmen"-Modal
  const acceptModal = document.getElementById("accept-modal");
  const modalQuestion = document.getElementById("modal-question");
  const acceptingPlayerNameInput = document.getElementById(
    "accepting-player-name"
  );
  const modalConfirmBtn = document.getElementById("modal-confirm-btn");
  const modalCancelBtn = acceptModal.querySelector(".cancel-btn"); // Sicherer Selektor
  const modalCloseBtn = acceptModal.querySelector(".close-btn");

  // API Basis-URL (funktioniert für Pages Functions)
  const API_BASE_URL = window.location.origin;

  // Globaler State
  let currentTuesdayDate = getNextTuesday(new Date()); // Startet mit dem nächsten Dienstag
  let currentRequestId = null; // Speichert die ID für das "Annehmen"-Modal
  let currentRequestsData = []; // Speichert die Rohdaten für Requests
  let currentConfirmedData = []; // Speichert die Rohdaten für bestätigte Spiele

  // --- Datumsfunktionen ---
  function getNextTuesday(fromDate) {
    const date = new Date(fromDate);
    date.setHours(12, 0, 0, 0); // Mittagszeit verwenden, um Zeitzonenprobleme zu minimieren
    const day = date.getDay(); // 0 = Sonntag, 1 = Montag, 2 = Dienstag, ...
    const diff = (2 - day + 7) % 7; // Tage bis zum nächsten Dienstag
    date.setDate(date.getDate() + diff);
    return date;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function formatDate(date) {
    // Format YYYY-MM-DD
    return date.toISOString().split("T")[0];
  }

  function formatDateForDisplay(date) {
    // Format: Dienstag, DD.MM.YYYY
    const options = {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    return date.toLocaleDateString("de-DE", options);
  }

  // --- UI Update Funktionen ---
  function updateWeekDisplay() {
    weekDisplay.textContent = `${formatDateForDisplay(currentTuesdayDate)}`;
    // Optional: Buttons deaktivieren, wenn man zu weit in die Zukunft/Vergangenheit geht
    // (Hier nicht implementiert, aber möglich)
  }

  function renderList(listElement, items, type) {
    listElement.innerHTML = ""; // Liste leeren

    // Filtern basierend auf der aktuellen Auswahl
    let currentFilterValue = "all";
    if (listElement.id === "requests-list" && filterSystemRequestsSelect) {
      currentFilterValue = filterSystemRequestsSelect.value;
    } else if (
      listElement.id === "confirmed-list" &&
      filterSystemConfirmedSelect
    ) {
      currentFilterValue = filterSystemConfirmedSelect.value;
    }

    const filteredItems = items.filter((item) => {
      if (currentFilterValue === "all") return true;
      const nameToCheck =
        type === "requests" ? item.player_name : item.player1_name; // Bei bestätigten Spielen ist P1 der Initiator
      if (!nameToCheck) return false;

      if (currentFilterValue === "AoS") return nameToCheck.includes("[AoS]");
      if (currentFilterValue === "40k") return nameToCheck.includes("[40k]");
      if (currentFilterValue === "none")
        return !nameToCheck.includes("[AoS]") && !nameToCheck.includes("[40k]");
      return true;
    });

    if (filteredItems.length === 0) {
      const li = document.createElement("li");
      if (items.length > 0 && filteredItems.length === 0) {
        // Es gibt Daten, aber Filter zeigt nichts
        li.textContent = `Keine Einträge für den gewählten Filter "${currentFilterValue.toUpperCase()}".`;
      } else {
        // Generische Nachricht
        li.textContent =
          type === "requests"
            ? "Keine offenen Spielgesuche für diese Woche."
            : "Keine bestätigten Spiele für diese Woche.";
      }
      li.classList.add("loading-placeholder");
      listElement.appendChild(li);
      return;
    }

    filteredItems.forEach((item) => {
      // ... (Rest der renderList Logik zum Erstellen der <li> Elemente bleibt gleich)
      const li = document.createElement("li");
      const textSpan = document.createElement("span");
      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("actions");

      if (type === "requests") {
        textSpan.textContent = `${item.player_name} sucht ein Spiel`; // Name mit Suffix wird angezeigt

        const acceptBtn = document.createElement("button");
        acceptBtn.textContent = "Annehmen";
        acceptBtn.classList.add("accept-btn");
        acceptBtn.onclick = () => openAcceptModal(item.id, item.player_name); // player_name enthält Suffix

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Löschen";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.onclick = () => deleteRequest(item.id);

        actionsDiv.appendChild(acceptBtn);
        actionsDiv.appendChild(deleteBtn);
      } else {
        // confirmed
        textSpan.textContent = `${item.player1_name} vs ${item.player2_name}`; // player1_name enthält Suffix
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Löschen";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.onclick = () => deleteConfirmedGame(item.id);
        actionsDiv.appendChild(deleteBtn);
      }
      li.appendChild(textSpan);
      li.appendChild(actionsDiv);
      listElement.appendChild(li);
    });
  }

  function setLoadingState(loading = true) {
    const placeholderRequest =
      '<li class="loading-placeholder">Lade Gesuche...</li>';
    const placeholderConfirmed =
      '<li class="loading-placeholder">Lade bestätigte Spiele...</li>';
    if (loading) {
      // Nur Platzhalter setzen, wenn Liste noch nicht initialisiert wurde oder leer ist
      if (
        requestsList.children.length === 0 ||
        requestsList.querySelector(".loading-placeholder")
      ) {
        requestsList.innerHTML = placeholderRequest;
      }
      if (
        confirmedList.children.length === 0 ||
        confirmedList.querySelector(".loading-placeholder")
      ) {
        confirmedList.innerHTML = placeholderConfirmed;
      }
    } else {
      // Entferne Platzhalter nur, wenn danach auch etwas gerendert wird (im fetchGames)
      // Das Leeren der Liste in renderList reicht meistens aus.
    }
  }

  function showLoadingError(listElement, type) {
    const li = document.createElement("li");
    li.textContent = `Fehler beim Laden der ${
      type === "requests" ? "Gesuche" : "Spiele"
    }.`;
    li.classList.add("loading-placeholder", "error");
    listElement.innerHTML = ""; // Vorherige Inhalte (auch Ladeanzeige) entfernen
    listElement.appendChild(li);
  }

  // --- Modal Funktionen ---
  function openAcceptModal(requestId, requestPlayerName) {
    currentRequestId = requestId; // ID speichern für den API-Aufruf
    modalQuestion.textContent = `Möchtest du das Spielgesuch von ${requestPlayerName} annehmen?`;
    acceptingPlayerNameInput.value = ""; // Input leeren
    acceptModal.classList.add("show"); // Modal anzeigen (CSS-Klasse hinzufügen)
    acceptingPlayerNameInput.focus(); // Fokus auf das Eingabefeld setzen
  }

  function closeModal() {
    if (acceptModal) {
      acceptModal.classList.remove("show"); // Modal verstecken (CSS-Klasse entfernen)
    }
    currentRequestId = null; // Gespeicherte ID zurücksetzen
  }

  // --- API Call Funktionen ---
  async function fetchGames() {
    setLoadingState(true);
    const dateStr = formatDate(currentTuesdayDate);
    try {
      // Nur die Daten für das ausgewählte Datum abrufen
      const response = await fetch(`${API_BASE_URL}/api/games?date=${dateStr}`);
      if (!response.ok) {
        // Versuchen, Fehlermeldung aus dem Body zu lesen
        let errorMsg = `HTTP error! Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          /* Ignorieren, wenn Body kein JSON ist */
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      currentRequestsData = data.requests || []; // Rohdaten speichern
      currentConfirmedData = data.confirmed || []; // Rohdaten speichern

      // Listen mit den neuen Rohdaten und aktuellen Filtern rendern
      renderList(requestsList, currentRequestsData, "requests");
      renderList(confirmedList, currentConfirmedData, "confirmed");
    } catch (error) {
      console.error("Fehler beim Abrufen der Spiele:", error);
      showLoadingError(requestsList, "requests");
      showLoadingError(confirmedList, "confirmed");
    }
  }

  async function submitNewRequest() {
    let playerName = newRequestNameInput.value.trim();
    const system = newRequestSystemSelect.value; // NEU: System auslesen

    if (!playerName) {
      showAddRequestError("Name darf nicht leer sein.");
      newRequestNameInput.focus();
      return;
    }
    hideAddRequestError();

    // Namen mit System-Suffix versehen
    if (system === "AoS") {
      playerName += " [AoS]";
    } else if (system === "40k") {
      playerName += " [40k]";
    }
    // Wenn system === "" (Egal), wird nichts angehängt

    const dateStr = formatDate(currentTuesdayDate);
    submitRequestBtn.disabled = true;
    submitRequestBtn.textContent = "Sende...";

    try {
      const response = await fetch(`${API_BASE_URL}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName, date: dateStr }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData?.error || `HTTP error! Status: ${response.status}`;
        throw new Error(errorMessage);
      }
      await response.json();
      hideAddRequestForm();
      fetchGames(); // Lädt neu und wendet Filter an
    } catch (error) {
      console.error("Fehler beim Hinzufügen des Gesuchs:", error);
      showAddRequestError(`Fehler: ${error.message}`);
      submitRequestBtn.disabled = false;
      submitRequestBtn.textContent = "Gesuch erstellen";
    }
  }

  async function deleteRequest(id) {
    if (!confirm("Möchtest du dieses Spielgesuch wirklich löschen?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/requests/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }
      await response.json();
      fetchGames(); // Liste neu laden
    } catch (error) {
      console.error("Fehler beim Löschen des Gesuchs:", error);
      alert(`Fehler beim Löschen: ${error.message}`);
    }
  }

  async function confirmAcceptRequest() {
    // Wird vom Modal-Button aufgerufen
    const acceptingPlayerName = acceptingPlayerNameInput.value.trim();
    if (!acceptingPlayerName) {
      alert("Bitte gib deinen Namen ein.");
      acceptingPlayerNameInput.focus();
      return;
    }
    if (!currentRequestId) {
      console.error("Fehler: Keine Request ID im Modal gespeichert.");
      closeModal();
      return;
    }

    // Optional: Frontend-Check, ob man sich selbst annimmt (Backend macht das auch)
    // const requestPlayerElement = requestsList.querySelector(...) // Müsste man finden
    // if (requestPlayerElement && acceptingPlayerName.toLowerCase() === requestPlayerElement.textContent.split(' ')[0].toLowerCase()) {
    //      alert("Du kannst dein eigenes Gesuch nicht annehmen.");
    //      return;
    // }

    modalConfirmBtn.disabled = true; // Button deaktivieren
    modalConfirmBtn.textContent = "Sende...";

    try {
      const response = await fetch(`${API_BASE_URL}/api/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: currentRequestId,
          acceptingPlayerName: acceptingPlayerName,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }
      await response.json();
      closeModal(); // Modal schließen bei Erfolg
      fetchGames(); // Liste neu laden
    } catch (error) {
      console.error("Fehler beim Annehmen des Gesuchs:", error);
      alert(`Fehler beim Annehmen: ${error.message}`);
      // Button im Modal bleibt deaktiviert, Nutzer muss ggf. abbrechen
    } finally {
      // Button wieder aktivieren, falls der Nutzer es erneut versuchen will (oder abbrechen)
      modalConfirmBtn.disabled = false;
      modalConfirmBtn.textContent = "Annehmen";
    }
  }

  async function deleteConfirmedGame(id) {
    if (!confirm("Möchtest du dieses bestätigte Spiel wirklich löschen?"))
      return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/confirmed/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }
      await response.json();
      fetchGames(); // Liste neu laden
    } catch (error) {
      console.error("Fehler beim Löschen des bestätigten Spiels:", error);
      alert(`Fehler beim Löschen: ${error.message}`);
    }
  }

  // --- UI Hilfsfunktionen für das Inline Formular ---
  function showAddRequestForm() {
    addRequestBtn.hidden = true; // Button "Ich suche..." verstecken
    addRequestForm.hidden = false; // Formular anzeigen
    newRequestNameInput.value = ""; // Input leeren
    hideAddRequestError(); // Alte Fehler löschen
    newRequestSystemSelect.value = "";
    newRequestNameInput.focus(); // Fokus auf Input
    submitRequestBtn.disabled = false; // Button aktivieren (falls vorher deaktiviert)
    submitRequestBtn.textContent = "Gesuch erstellen"; // Button Text zurücksetzen
  }

  function hideAddRequestForm() {
    addRequestForm.hidden = true; // Formular verstecken
    addRequestBtn.hidden = false; // Button "Ich suche..." anzeigen
    newRequestNameInput.value = ""; // Input leeren
    hideAddRequestError(); // Fehler löschen
  }

  function showAddRequestError(message) {
    addRequestError.textContent = message;
    addRequestError.hidden = false;
  }

  function hideAddRequestError() {
    addRequestError.textContent = "";
    addRequestError.hidden = true;
  }

  // --- Event Listeners ---
  // Wochennavigation
  prevWeekBtn.addEventListener("click", () => {
    currentTuesdayDate = addDays(currentTuesdayDate, -7);
    updateWeekDisplay();
    fetchGames();
    hideAddRequestForm(); // Formular verstecken beim Wochenwechsel
  });

  nextWeekBtn.addEventListener("click", () => {
    // Optional: Begrenzung auf nächste Woche (Hier implementiert)
    const today = new Date();
    const thisWeeksTuesday = getNextTuesday(today);
    const nextWeeksTuesday = addDays(thisWeeksTuesday, 7);

    // Erlaube nur diese Woche und die nächste Woche
    if (
      formatDate(addDays(currentTuesdayDate, 7)) <= formatDate(nextWeeksTuesday)
    ) {
      currentTuesdayDate = addDays(currentTuesdayDate, 7);
      updateWeekDisplay();
      fetchGames();
      hideAddRequestForm(); // Formular verstecken beim Wochenwechsel
    } else {
      alert(
        "Du kannst nur Spiele für die aktuelle und nächste Woche anzeigen/eintragen."
      );
      // Begrenzung kann entfernt werden, wenn weiter in die Zukunft geblättert werden soll
    }
  });

  // Inline-Formular Steuerung
  addRequestBtn.addEventListener("click", showAddRequestForm); // Zeigt das Formular an
  cancelRequestBtn.addEventListener("click", hideAddRequestForm); // Versteckt das Formular
  submitRequestBtn.addEventListener("click", submitNewRequest); // Sendet das Formular

  // Optional: Formular auch bei Enter im Input-Feld absenden
  newRequestNameInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Verhindert Standard-Formular-Verhalten
      submitNewRequest();
    }
  });

  // Modal Steuerung
  modalConfirmBtn.addEventListener("click", confirmAcceptRequest); // Bestätigt die Annahme
  if (modalCancelBtn) {
    // Sicherstellen, dass der Button existiert
    modalCancelBtn.addEventListener("click", closeModal); // Schließt Modal bei Klick auf Abbrechen
  }
  if (modalCloseBtn) {
    // Sicherstellen, dass der Button existiert
    modalCloseBtn.addEventListener("click", closeModal); // Schließt Modal bei Klick auf X
  }
  // Schließen, wenn außerhalb des Modals geklickt wird
  window.addEventListener("click", function (event) {
    if (event.target == acceptModal) {
      // Prüfen ob Klick auf den Hintergrund (das Modal selbst)
      closeModal();
    }
  });
  // NEU: Event Listener für Filter
  if (filterSystemRequestsSelect) {
    filterSystemRequestsSelect.addEventListener("change", () => {
      renderList(requestsList, currentRequestsData, "requests"); // Liste mit aktuellen Daten und neuem Filter neu rendern
    });
  }
  if (filterSystemConfirmedSelect) {
    filterSystemConfirmedSelect.addEventListener("change", () => {
      renderList(confirmedList, currentConfirmedData, "confirmed");
    });
  }

  // --- Initial Load ---
  updateWeekDisplay(); // Sofort das Datum anzeigen
  fetchGames(); // Initiales Laden der Spieldaten für die aktuelle Woche
});
