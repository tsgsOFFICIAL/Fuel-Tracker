const modal = document.getElementById("modal");
const addFuelBtn = document.getElementById("add-fuel-btn");
const closeBtn = document.querySelector(".close-btn");
const fuelUpForm = document.getElementById("fuel-up-form");
const fuelUpsList = document.getElementById("fuel-ups-list");
const avgConsumptionEl = document.getElementById("avg-consumption");
const totalDistanceEl = document.getElementById("total-distance");
const totalCostEl = document.getElementById("total-cost");
const monthlyStatsContainer = document.getElementById("monthly-stats-container");

let fuelUps = JSON.parse(localStorage.getItem("fuelUps")) || [];

addFuelBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
fuelUpForm.addEventListener("submit", addFuelUp);
window.addEventListener("click", (e) => {
	if (e.target === modal) {
		closeModal();
	}
});

document.getElementById("date").valueAsDate = new Date();

renderFuelUps();
updateStats();
updateMonthlyStats();

function openModal() {
	modal.style.display = "block";
}

function closeModal() {
	modal.style.display = "none";
	fuelUpForm.reset();
	document.getElementById("date").valueAsDate = new Date();
}

function addFuelUp(e) {
	e.preventDefault();

	const date = document.getElementById("date").value;
	const liters = Number.parseFloat(document.getElementById("liters").value);
	const cost = Number.parseFloat(document.getElementById("cost").value);
	const odometer = Number.parseFloat(document.getElementById("odometer").value);

	// Sort fuelUps by date descending, then by index descending for equal dates
	const sortedFuelUps = fuelUps
		.map((fuelUp, index) => ({ fuelUp, index }))
		.sort((a, b) => {
			const dateDiff = new Date(b.fuelUp.date) - new Date(a.fuelUp.date);
			return dateDiff !== 0 ? dateDiff : b.index - a.index;
		});

	const lastFuelUp = sortedFuelUps[0]?.fuelUp || null;
	const lastOdometer = lastFuelUp ? lastFuelUp.odometer : 0;

	if (lastOdometer && odometer <= lastOdometer) {
		alert("Kilometerstand skal være højere end den forrige aflæsning.");
		return;
	}

	const kilometers = lastOdometer ? odometer - lastOdometer : odometer;
	const efficiency = lastOdometer ? kilometers / liters : null;

	// Debug logging
	// console.log(`Adding fuel-up: date=${date}, odometer=${odometer}, lastOdometer=${lastOdometer}, kilometers=${kilometers}, efficiency=${efficiency}`);

	const newFuelUp = {
		id: Date.now(),
		date,
		liters,
		cost,
		kilometers,
		odometer,
		efficiency
	};

	fuelUps.push(newFuelUp);
	saveFuelUps();
	renderFuelUps();
	updateStats();
	updateMonthlyStats();
	closeModal();
}

function deleteFuelUp(id) {
	if (confirm("Er du sikker på, at du vil slette denne post?")) {
		// Find the fuel-up to delete
		const fuelUpToDelete = fuelUps.find((fuelUp) => fuelUp.id === id);
		if (!fuelUpToDelete) return;

		// Check if it's the earliest fuel-up by date or the last in the array
		const sortedFuelUps = [...fuelUps].sort((a, b) => new Date(a.date) - new Date(b.date));
		const isEarliest = sortedFuelUps[0]?.id === id;
		const isLast = fuelUps[fuelUps.length - 1]?.id === id;

		if (!isEarliest && !isLast) {
			alert("Kun den tidligste eller seneste brændstofpåfyldning kan slettes for at opretholde nøjagtige distanceberegninger.");
			return;
		}

		// Remove the fuel-up
		fuelUps = fuelUps.filter((fuelUp) => fuelUp.id !== id);

		// If the deleted fuel-up was the earliest, adjust the new earliest to be a baseline
		if (isEarliest && fuelUps.length > 0) {
			const newSortedFuelUps = [...fuelUps].sort((a, b) => new Date(a.date) - new Date(b.date));
			const newEarliest = newSortedFuelUps[0];
			if (newEarliest && newEarliest.efficiency !== null) {
				newEarliest.kilometers = newEarliest.odometer;
				newEarliest.efficiency = null;
			}
		}

		saveFuelUps();
		renderFuelUps();
		updateStats();
		updateMonthlyStats();
	}
}

function saveFuelUps() {
	localStorage.setItem("fuelUps", JSON.stringify(fuelUps));
}

function renderFuelUps() {
	if (fuelUps.length === 0) {
		fuelUpsList.innerHTML = '<p class="empty-state">Ingen brændstofpåfyldninger registreret endnu</p>';
		return;
	}

	// Find the earliest fuel-up by date
	const earliestFuelUp = [...fuelUps].sort((a, b) => new Date(a.date) - new Date(b.date))[0];

	// Sort fuel-ups by date descending for display (newest first)
	const sortedFuelUps = [...fuelUps].sort((a, b) => new Date(b.date) - new Date(a.date));

	fuelUpsList.innerHTML = sortedFuelUps
		.map(
			(fuelUp) => `
        <div class="fuel-up-item ${fuelUp.id === earliestFuelUp?.id ? "first-fuel-up" : ""}" data-id="${fuelUp.id}">
            <div class="fuel-up-header">
                <div class="fuel-up-date-container">
                    <span class="fuel-up-date">${formatDate(fuelUp.date)}</span>
                    <span class="delete-btn" onclick="deleteFuelUp(${fuelUp.id})">×</span>
                </div>
                <span class="fuel-up-efficiency">${fuelUp.efficiency ? fuelUp.efficiency.toFixed(2) + " km/l" : ""}</span>
            </div>
            <div class="fuel-up-details">
                <span class="fuel-up-detail">${fuelUp.kilometers} km</span>
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
		return motiv;
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

function formatDate(dateString) {
	const options = { year: "numeric", month: "short", day: "numeric" };
	return new Date(dateString).toLocaleDateString("da-DK", options);
}
