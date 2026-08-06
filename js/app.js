const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const addFuelBtn = document.getElementById("add-fuel-btn");
const closeBtn = document.querySelector(".close-btn");
const fuelUpForm = document.getElementById("fuel-up-form");
const submitBtn = document.querySelector(".submit-btn");
const dateInput = document.getElementById("date");
const fuelUpsList = document.getElementById("fuel-ups-list");
const avgConsumptionEl = document.getElementById("avg-consumption");
const totalDistanceEl = document.getElementById("total-distance");
const totalCostEl = document.getElementById("total-cost");
const monthlyStatsContainer = document.getElementById("monthly-stats-container");
const trendChartContainer = document.getElementById("trend-chart-container");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-file");

const svgAttrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const editIconSvg = `<svg ${svgAttrs}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
const deleteIconSvg = `<svg ${svgAttrs}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

let fuelUps = JSON.parse(localStorage.getItem("fuelUps")) || [];
let editingFuelUpId = null;

addFuelBtn.addEventListener("click", () => openModal());
closeBtn.addEventListener("click", closeModal);
fuelUpForm.addEventListener("submit", saveFuelUp);
exportBtn.addEventListener("click", exportFuelUps);
importBtn.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", importFuelUps);
window.addEventListener("click", (e) => {
	if (e.target === modal) {
		closeModal();
	}
});

dateInput.valueAsDate = new Date();
dateInput.max = getTodayLocalISOString();

renderFuelUps();
updateStats();
updateMonthlyStats();
renderTrendChart();

function openModal(fuelUp = null) {
	editingFuelUpId = fuelUp ? fuelUp.id : null;
	modalTitle.textContent = fuelUp ? "Rediger tankning" : "Tilføj tankning";
	submitBtn.textContent = fuelUp ? "Opdater" : "Gem";
	dateInput.max = getTodayLocalISOString();

	if (fuelUp) {
		dateInput.value = fuelUp.date;
		document.getElementById("cost").value = fuelUp.cost;
		document.getElementById("liters").value = fuelUp.liters;
		document.getElementById("odometer").value = fuelUp.odometer;
	} else {
		fuelUpForm.reset();
		dateInput.valueAsDate = new Date();
	}

	modal.style.display = "block";
}

function closeModal() {
	modal.style.display = "none";
	fuelUpForm.reset();
	editingFuelUpId = null;
	modalTitle.textContent = "Tilføj tankning";
	submitBtn.textContent = "Gem";
	dateInput.valueAsDate = new Date();
}

function editFuelUp(id) {
	const fuelUp = fuelUps.find((f) => f.id === id);
	if (fuelUp) openModal(fuelUp);
}

function getTodayLocalISOString() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Fuel-ups sorted chronologically, ties broken by id, optionally excluding one entry
function getSortedFuelUps(excludeId = null) {
	return fuelUps
		.filter((f) => f.id !== excludeId)
		.sort((a, b) => {
			const dateDiff = new Date(a.date) - new Date(b.date);
			return dateDiff !== 0 ? dateDiff : a.id - b.id;
		});
}

// Finds the chronological neighbors a fuel-up with the given date/id would sit between
function findNeighbors(sortedFuelUps, date, id) {
	let prev = null;
	let next = null;

	for (const f of sortedFuelUps) {
		const isBefore = new Date(f.date) < new Date(date) || (new Date(f.date).getTime() === new Date(date).getTime() && f.id < id);
		if (isBefore) {
			prev = f;
		} else {
			next = f;
			break;
		}
	}

	return { prev, next };
}

// Recomputes kilometers/efficiency for every entry based on chronological order
function recalculateAll() {
	const sorted = getSortedFuelUps();
	let lastOdometer = 0;

	sorted.forEach((fuelUp, index) => {
		if (index === 0) {
			fuelUp.kilometers = fuelUp.odometer;
			fuelUp.efficiency = null;
		} else {
			fuelUp.kilometers = fuelUp.odometer - lastOdometer;
			fuelUp.efficiency = fuelUp.liters > 0 ? fuelUp.kilometers / fuelUp.liters : null;
		}
		lastOdometer = fuelUp.odometer;
	});
}

function saveFuelUp(e) {
	e.preventDefault();

	const date = dateInput.value;
	const liters = Number.parseFloat(document.getElementById("liters").value);
	const cost = Number.parseFloat(document.getElementById("cost").value);
	const odometer = Number.parseFloat(document.getElementById("odometer").value);

	if (date > getTodayLocalISOString()) {
		alert("Dato kan ikke være i fremtiden.");
		return;
	}

	const id = editingFuelUpId ?? Date.now();
	const others = getSortedFuelUps(editingFuelUpId);
	const { prev, next } = findNeighbors(others, date, id);

	if (prev && odometer <= prev.odometer) {
		alert("Kilometerstand skal være højere end den forrige aflæsning.");
		return;
	}
	if (next && odometer >= next.odometer) {
		alert("Kilometerstand skal være lavere end den næste aflæsning.");
		return;
	}

	if (editingFuelUpId) {
		const existing = fuelUps.find((f) => f.id === editingFuelUpId);
		existing.date = date;
		existing.liters = liters;
		existing.cost = cost;
		existing.odometer = odometer;
	} else {
		fuelUps.push({ id, date, liters, cost, odometer, kilometers: 0, efficiency: null });
	}

	recalculateAll();
	saveFuelUps();
	renderFuelUps();
	updateStats();
	updateMonthlyStats();
	renderTrendChart();
	closeModal();
}

function deleteFuelUp(id) {
	if (confirm("Er du sikker på, at du vil slette denne post?")) {
		// Find the fuel-up to delete
		const fuelUpToDelete = fuelUps.find((fuelUp) => fuelUp.id === id);
		if (!fuelUpToDelete) return;

		// Check if it's the earliest or latest fuel-up by date
		const sortedFuelUps = getSortedFuelUps();
		const isEarliest = sortedFuelUps[0]?.id === id;
		const isLast = sortedFuelUps[sortedFuelUps.length - 1]?.id === id;

		if (!isEarliest && !isLast) {
			alert("Kun den tidligste eller seneste tankning kan slettes for at opretholde nøjagtige distanceberegninger.");
			return;
		}

		fuelUps = fuelUps.filter((fuelUp) => fuelUp.id !== id);
		recalculateAll();

		saveFuelUps();
		renderFuelUps();
		updateStats();
		updateMonthlyStats();
		renderTrendChart();
	}
}

function saveFuelUps() {
	localStorage.setItem("fuelUps", JSON.stringify(fuelUps));
}

function exportFuelUps() {
	const blob = new Blob([JSON.stringify(fuelUps, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `tanksporer-backup-${getTodayLocalISOString()}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

function isValidFuelUpRecord(f) {
	return (
		f &&
		typeof f.date === "string" &&
		!Number.isNaN(new Date(f.date).getTime()) &&
		!Number.isNaN(Number.parseFloat(f.liters)) &&
		!Number.isNaN(Number.parseFloat(f.cost)) &&
		!Number.isNaN(Number.parseFloat(f.odometer))
	);
}

function importFuelUps(e) {
	const file = e.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = () => {
		let imported;
		try {
			imported = JSON.parse(reader.result);
		} catch {
			alert("Filen kunne ikke læses. Sørg for, at det er en gyldig JSON-fil.");
			importFileInput.value = "";
			return;
		}

		if (!Array.isArray(imported) || !imported.every(isValidFuelUpRecord)) {
			alert("Filens indhold matcher ikke det forventede format for tankninger.");
			importFileInput.value = "";
			return;
		}

		if (!confirm(`Dette vil erstatte dine ${fuelUps.length} nuværende tankninger med ${imported.length} importerede tankninger. Fortsæt?`)) {
			importFileInput.value = "";
			return;
		}

		fuelUps = imported.map((f, index) => ({
			id: Date.now() + index,
			date: f.date,
			liters: Number.parseFloat(f.liters),
			cost: Number.parseFloat(f.cost),
			odometer: Number.parseFloat(f.odometer),
			kilometers: 0,
			efficiency: null
		}));

		recalculateAll();
		saveFuelUps();
		renderFuelUps();
		updateStats();
		updateMonthlyStats();
		renderTrendChart();
		importFileInput.value = "";
	};
	reader.readAsText(file);
}

function renderFuelUps() {
	if (fuelUps.length === 0) {
		fuelUpsList.innerHTML = '<p class="empty-state">Ingen tankning registreret endnu</p>';
		return;
	}

	// Find the earliest fuel-up by date
	const earliestFuelUp = getSortedFuelUps()[0];

	// Sort fuel-ups by date descending for display (newest first)
	const sortedFuelUps = [...fuelUps].sort((a, b) => new Date(b.date) - new Date(a.date));

	fuelUpsList.innerHTML = sortedFuelUps
		.map(
			(fuelUp) => `
        <div class="fuel-up-item ${fuelUp.id === earliestFuelUp?.id ? "first-fuel-up" : ""}" data-id="${fuelUp.id}">
            <div class="fuel-up-header">
                <div class="fuel-up-date-container">
                    <span class="fuel-up-date">${formatDate(fuelUp.date)}</span>
                    <span class="edit-btn" onclick="editFuelUp(${fuelUp.id})" title="Rediger">${editIconSvg}</span>
                    <span class="delete-btn" onclick="deleteFuelUp(${fuelUp.id})" title="Slet">${deleteIconSvg}</span>
                </div>
                <span class="fuel-up-efficiency">${fuelUp.efficiency ? fuelUp.efficiency.toFixed(2) + " km/l" : ""}</span>
            </div>
            <div class="fuel-up-details">
				<span class="fuel-up-detail">${fuelUp.kilometers} km</span>
				<span class="fuel-up-detail">${fuelUp.odometer.toFixed(1)} km</span>
                <span class="fuel-up-detail">${fuelUp.liters} liter</span>
                <span class="fuel-up-detail">${fuelUp.cost.toFixed(2)} DKK</span>
                <span class="fuel-up-detail">${(fuelUp.cost / fuelUp.liters).toFixed(2) + " DKK/L"}</span>
            </div>
        </div>
    `
		)
		.join("");
}

function updateStats() {
	if (fuelUps.length === 0) {
		avgConsumptionEl.textContent = "0 km/l";
		totalDistanceEl.textContent = "0 km";
		totalCostEl.textContent = "0,- DKK";
		return;
	}

	const validFuelUps = fuelUps.filter((fuelUp) => fuelUp.efficiency !== null);
	const totalKilometers = validFuelUps.reduce((sum, fuelUp) => sum + fuelUp.kilometers, 0);
	const totalLiters = validFuelUps.reduce((sum, fuelUp) => sum + fuelUp.liters, 0);
	const totalCost = fuelUps.reduce((sum, fuelUp) => sum + fuelUp.cost, 0);

	const avgConsumption = totalLiters > 0 ? totalKilometers / totalLiters : 0;

	avgConsumptionEl.textContent = `${avgConsumption.toFixed(2)} km/l`;
	totalDistanceEl.textContent = `${totalKilometers.toFixed(1)} km`;
	totalCostEl.textContent = `${totalCost.toFixed(2)} DKK`;
}

function updateMonthlyStats() {
	if (fuelUps.length === 0) {
		monthlyStatsContainer.innerHTML = '<p class="empty-state">Ingen data tilgængelige endnu</p>';
		return;
	}

	const monthlyData = {};

	fuelUps.forEach((fuelUp) => {
		const date = new Date(fuelUp.date);
		const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;

		if (!monthlyData[monthYear]) {
			monthlyData[monthYear] = {
				kilometers: 0,
				liters: 0,
				validLiters: 0,
				cost: 0,
				validEntries: 0
			};
		}

		if (fuelUp.efficiency !== null) {
			monthlyData[monthYear].kilometers += fuelUp.kilometers;
			monthlyData[monthYear].validLiters += fuelUp.liters;
			monthlyData[monthYear].validEntries += 1;
		}
		monthlyData[monthYear].liters += fuelUp.liters;
		monthlyData[monthYear].cost += fuelUp.cost;
	});

	const sortedMonths = Object.keys(monthlyData).sort().reverse();

	monthlyStatsContainer.innerHTML = sortedMonths
		.map((month) => {
			const data = monthlyData[month];
			const efficiency = data.validEntries > 0 ? data.kilometers / data.validLiters : null;
			const [year, monthNum] = month.split("-");
			const monthName = new Date(year, monthNum - 1, 1).toLocaleString("da-DK", { month: "long" });

			return `
            <div class="monthly-stat-item">
                <div>
                    <strong>${monthName} ${year}</strong>
                    <div>${data.kilometers.toFixed(1)} km | ${data.liters.toFixed(1)} liter</div>
                </div>
                <div>
                    <div>${efficiency ? efficiency.toFixed(2) + " km/l" : "Ikke tilgængelig"}</div>
                    <div>${data.cost.toFixed(2)} DKK</div>
                </div>
            </div>
        `;
		})
		.join("");
}

function renderTrendChart() {
	const validFuelUps = getSortedFuelUps().filter((f) => f.efficiency !== null);

	if (validFuelUps.length < 2) {
		trendChartContainer.innerHTML = '<p class="empty-state">Tilføj flere tankninger for at se udviklingen</p>';
		return;
	}

	const width = 600;
	const height = 200;
	const padding = 30;

	const values = validFuelUps.map((f) => f.efficiency);
	const minVal = Math.min(...values);
	const maxVal = Math.max(...values);
	const range = maxVal - minVal || 1;

	const stepX = (width - padding * 2) / (validFuelUps.length - 1);
	const points = validFuelUps.map((f, index) => ({
		x: padding + index * stepX,
		y: height - padding - ((f.efficiency - minVal) / range) * (height - padding * 2),
		efficiency: f.efficiency,
		date: f.date
	}));

	const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
	const dots = points
		.map(
			(p) =>
				`<circle class="trend-dot" cx="${p.x}" cy="${p.y}" r="3"><title>${formatDate(p.date)}: ${p.efficiency.toFixed(2)} km/l</title></circle>`
		)
		.join("");

	trendChartContainer.innerHTML = `
        <svg class="trend-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
            <polyline class="trend-line" points="${linePoints}" />
            ${dots}
            <text class="trend-axis-label" x="${padding}" y="12">${maxVal.toFixed(1)} km/l</text>
            <text class="trend-axis-label" x="${padding}" y="${height - padding + 15}">${minVal.toFixed(1)} km/l</text>
        </svg>
    `;
}

function formatDate(dateString) {
	const options = { year: "numeric", month: "short", day: "numeric" };
	return new Date(dateString).toLocaleDateString("da-DK", options);
}
