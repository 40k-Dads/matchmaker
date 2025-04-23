document.addEventListener("DOMContentLoaded", () => {
  const prevWeekBtn = document.getElementById("prev-week");
  const nextWeekBtn = document.getElementById("next-week");
  const weekDisplay = document.getElementById("week-display");
  const requestsList = document.getElementById("requests-list");
  const confirmedList = document.getElementById("confirmed-list");
  const addRequestBtn = document.getElementById("add-request-btn");

  // Basis-URL für die API (wird bei lokaler Entwicklung angepasst)
  // Bei Deployment über Wrangler wird dies automatisch die URL deines Workers
  const API_BASE_URL = window.location.origin;

  let currentTuesdayDate = getNextTuesday(new Date()); // Startet mit dem nächsten Dienstag

  // --- Datumsfunktionen ---
  function getNextTuesday(fromDate) {
    const date = new Date(fromDate);
    const day = date.getDay(); // 0 = Sonntag, 1 = Montag, 2 = Dienstag, ...
    const diff = (2 - day + 7) % 7; // Tage bis zum nächsten Dienstag (0 wenn heute Dienstag ist)
    date.setDate(date.getDate() + (diff === 0 ? 0 : diff)); // Gehe zum nächsten Dienstag
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
    weekDisplay.textContent = `Diese Woche (${formatDateForDisplay(
      currentTuesdayDate
    )})`;
  }

  function renderList(listElement, items, type) {
    listElement.innerHTML = ""; // Liste leeren
    if (items.length === 0) {
      const li = document.createElement("li");
      li.textContent =
        type === "requests"
          ? "Keine Spielgesuche für diese Woche."
          : "Keine bestätigten Spiele für diese Woche.";
      li.classList.add("loading-placeholder"); // Gleiches Styling wie Ladeplatzhalter
      listElement.appendChild(li);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      const textSpan = document.createElement("span");
      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("actions");

      if (type === "requests") {
        textSpan.textContent = `${item.player_name} sucht ein Spiel`;

        const acceptBtn = document.createElement("button");
        acceptBtn.textContent = "Annehmen";
        acceptBtn.classList.add("accept-btn");
        acceptBtn.onclick = () => acceptRequest(item.id, item.player_name);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Löschen";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.onclick = () => deleteRequest(item.id);

        actionsDiv.appendChild(acceptBtn);
        actionsDiv.appendChild(deleteBtn);
      } else {
        // confirmed
        textSpan.textContent = `${item.player1_name} vs ${item.player2_name}`;

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
    requestsList.innerHTML = loading
      ? '<li class="loading-placeholder">Lade Gesuche...</li>'
      : "";
    confirmedList.innerHTML = loading
      ? '<li class="loading-placeholder">Lade bestätigte Spiele...</li>'
      : "";
  }

  // --- API Call Funktionen ---
  async function fetchGames() {
    setLoadingState(true);
    const dateStr = formatDate(currentTuesdayDate);
    try {
      const response = await fetch(`${API_BASE_URL}/api/games?date=${dateStr}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      renderList(requestsList, data.requests || [], "requests");
      renderList(confirmedList, data.confirmed || [], "confirmed");
    } catch (error) {
      console.error("Fehler beim Abrufen der Spiele:", error);
      requestsList.innerHTML =
        '<li class="loading-placeholder error">Fehler beim Laden der Gesuche.</li>';
      confirmedList.innerHTML =
        '<li class="loading-placeholder error">Fehler beim Laden der Spiele.</li>';
    } finally {
      // Optional: setLoadingState(false) wenn man die Platzhalter nicht behalten will
    }
  }

  async function addRequest() {
    const playerName = prompt("Bitte gib deinen Namen ein:");
    if (!playerName || playerName.trim() === "") {
      alert("Name darf nicht leer sein.");
      return;
    }

    const dateStr = formatDate(currentTuesdayDate);
    try {
      const response = await fetch(`${API_BASE_URL}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName.trim(), date: dateStr }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }
      await response.json(); // Antwort verarbeiten (optional)
      fetchGames(); // Liste neu laden
    } catch (error) {
      console.error("Fehler beim Hinzufügen des Gesuchs:", error);
      alert(`Fehler beim Hinzufügen: ${error.message}`);
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

  async function acceptRequest(requestId, requestPlayerName) {
    const acceptingPlayerName = prompt(
      `Du nimmst das Spiel von ${requestPlayerName} an.\nBitte gib DEINEN Namen ein:`
    );
    if (!acceptingPlayerName || acceptingPlayerName.trim() === "") {
      alert("Name darf nicht leer sein.");
      return;
    }
    if (
      acceptingPlayerName.trim().toLowerCase() ===
      requestPlayerName.toLowerCase()
    ) {
      alert("Du kannst dein eigenes Spielgesuch nicht annehmen.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId,
          acceptingPlayerName: acceptingPlayerName.trim(),
        }),
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
      console.error("Fehler beim Annehmen des Gesuchs:", error);
      alert(`Fehler beim Annehmen: ${error.message}`);
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

  // --- Event Listeners ---
  prevWeekBtn.addEventListener("click", () => {
    currentTuesdayDate = addDays(currentTuesdayDate, -7);
    updateWeekDisplay();
    fetchGames();
  });

  nextWeekBtn.addEventListener("click", () => {
    // Optional: Begrenzung auf nächste Woche, falls gewünscht
    const nextTuesday = getNextTuesday(new Date());
    const oneWeekFromNextTuesday = addDays(nextTuesday, 7);
    if (currentTuesdayDate < oneWeekFromNextTuesday) {
      // Erlaube aktuelle und nächste Woche
      currentTuesdayDate = addDays(currentTuesdayDate, 7);
      updateWeekDisplay();
      fetchGames();
    } else {
      alert(
        "Du kannst nur Spiele für die aktuelle und nächste Woche anzeigen/eintragen."
      );
    }
    // Einfachere Variante ohne Begrenzung:
    // currentTuesdayDate = addDays(currentTuesdayDate, 7);
    // updateWeekDisplay();
    // fetchGames();
  });

  addRequestBtn.addEventListener("click", addRequest);

  // --- Initial Load ---
  updateWeekDisplay();
  fetchGames();
});
document.addEventListener("DOMContentLoaded", () => {
  // ... (andere Variablen wie gehabt: prevWeekBtn, nextWeekBtn, etc.) ...
  const requestsList = document.getElementById("requests-list");
  const confirmedList = document.getElementById("confirmed-list");
  const addRequestBtn = document.getElementById("add-request-btn");

  // Modal Elemente holen
  const acceptModal = document.getElementById("accept-modal");
  const modalQuestion = document.getElementById("modal-question");
  const acceptingPlayerNameInput = document.getElementById(
    "accepting-player-name"
  );
  const modalConfirmBtn = document.getElementById("modal-confirm-btn");
  const modalCloseBtn = document.querySelector(".close-btn"); // Kann auch über ID gehen

  const API_BASE_URL = window.location.origin;
  let currentTuesdayDate = getNextTuesday(new Date());
  let currentRequestId = null; // Variable zum Speichern der ID für das Modal

  // --- Datumsfunktionen (unverändert) ---
  function getNextTuesday(fromDate) {
    /* ... */
  }
  function addDays(date, days) {
    /* ... */
  }
  function formatDate(date) {
    /* ... */
  }
  function formatDateForDisplay(date) {
    /* ... */
  }

  // --- UI Update Funktionen ---
  function updateWeekDisplay() {
    /* ... (unverändert) ... */
  }

  function renderList(listElement, items, type) {
    listElement.innerHTML = ""; // Liste leeren
    if (items.length === 0) {
      // ... (Keine Elemente Nachricht, unverändert) ...
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      const textSpan = document.createElement("span");
      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("actions");

      if (type === "requests") {
        textSpan.textContent = `${item.player_name} sucht ein Spiel`;

        const acceptBtn = document.createElement("button");
        acceptBtn.textContent = "Annehmen";
        acceptBtn.classList.add("accept-btn");
        // HIER die Änderung: Ruft jetzt openAcceptModal auf
        acceptBtn.onclick = () => openAcceptModal(item.id, item.player_name);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Löschen";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.onclick = () => deleteRequest(item.id);

        actionsDiv.appendChild(acceptBtn);
        actionsDiv.appendChild(deleteBtn);
      } else {
        // confirmed
        // ... (Bestätigte Spiele rendern, unverändert) ...
        textSpan.textContent = `${item.player1_name} vs ${item.player2_name}`;
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
    /* ... (unverändert) ... */
  }

  // --- Modal Funktionen ---
  function openAcceptModal(requestId, requestPlayerName) {
    currentRequestId = requestId; // ID speichern für den API-Aufruf
    modalQuestion.textContent = `Möchtest du das Spielgesuch von ${requestPlayerName} annehmen?`;
    acceptingPlayerNameInput.value = ""; // Input leeren
    acceptModal.classList.add("show"); // Modal anzeigen
    acceptingPlayerNameInput.focus(); // Fokus auf das Eingabefeld setzen
  }

  function closeModal() {
    acceptModal.classList.remove("show"); // Modal verstecken
    currentRequestId = null; // Gespeicherte ID zurücksetzen
  }

  // Event Listener für Modal Buttons (außerhalb von openAcceptModal hinzufügen)
  modalConfirmBtn.onclick = () => {
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
    // Hier den API-Aufruf ausführen
    confirmAcceptRequest(currentRequestId, acceptingPlayerName);
  };

  // Schließen, wenn auf Schließen-Button oder außerhalb geklickt wird (optional)
  if (modalCloseBtn) {
    modalCloseBtn.onclick = closeModal;
  }
  window.onclick = function (event) {
    if (event.target == acceptModal) {
      closeModal();
    }
  };

  // --- API Call Funktionen ---
  async function fetchGames() {
    /* ... (unverändert) ... */
  }
  async function addRequest() {
    /* ... (unverändert) ... */
  }
  async function deleteRequest(id) {
    /* ... (unverändert) ... */
  }

  // *** Frühere acceptRequest Funktion wird durch diese ersetzt/genutzt ***
  async function confirmAcceptRequest(requestId, acceptingPlayerName) {
    // Optional: Prüfen, ob der Name dem Anfragenden entspricht (obwohl das Backend das auch tun sollte)
    // const requestPlayerName = ... (müsste man sich merken oder neu laden)
    // if (acceptingPlayerName.toLowerCase() === requestPlayerName.toLowerCase()) {
    //     alert("Du kannst dein eigenes Gesuch nicht annehmen.");
    //     return;
    // }

    try {
      const response = await fetch(`${API_BASE_URL}/api/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId,
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
      // Modal bleibt offen, damit der Nutzer es erneut versuchen oder abbrechen kann
    }
  }

  async function deleteConfirmedGame(id) {
    /* ... (unverändert) ... */
  }

  // --- Event Listeners (unverändert) ---
  prevWeekBtn.addEventListener("click", () => {
    /* ... */
  });
  nextWeekBtn.addEventListener("click", () => {
    /* ... */
  });
  addRequestBtn.addEventListener("click", addRequest);

  // --- Initial Load (unverändert) ---
  updateWeekDisplay();
  fetchGames();
});
