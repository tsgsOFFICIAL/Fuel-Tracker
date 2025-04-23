// Install PWA
const pwaCloseButton = document.querySelector("#pwa-close-prompt");
const pwaPrompt = document.querySelector("#pwa-install-banner");
const pwaInstallButton = document.querySelector("#pwa-install-button");

window.addEventListener("load", () => {
	pwaCloseButton.addEventListener("click", (e) => {
		rejectInstallPrompt();
	});
});

window.addEventListener("beforeinstallprompt", (event) => {
	event.preventDefault();

	// PWA Install Prompt
	pwaPrompt.classList.remove("hidden");
	pwaPrompt.classList.add("visible");

	window.promptEvent = event;
});

pwaInstallButton.addEventListener("click", () => {
	addToHomeScreen();
});

function rejectInstallPrompt() {
	removePrompt();
}

function removePrompt() {
	pwaPrompt.classList.add("animateOut");

	pwaPrompt.addEventListener("animationend", () => {
		pwaPrompt.remove();
	});
}

function addToHomeScreen() {
	window.promptEvent.prompt();

	window.promptEvent.userChoice.then((choiceResult) => {
		if (choiceResult.outcome === "accepted") {
			// User accepted the A2HS prompt
		}

		window.promptEvent = null;
	});

	removePrompt();
}
