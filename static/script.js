const inventoryBody = document.getElementById("inventory-body");
const feedback = document.getElementById("feedback");
const productCount = document.getElementById("product-count");
const unitCount = document.getElementById("unit-count");
const sportCount = document.getElementById("sport-count");
const inventoryValue = document.getElementById("inventory-value");
const connectionStatus = document.getElementById("connection-status");
const lastUpdated = document.getElementById("last-updated");
const recordPill = document.getElementById("record-pill");
const searchInput = document.getElementById("inventory-search");
const createProductForm = document.getElementById("create-product-form");
const createSubmitButton = document.getElementById("create-submit");
const cancelEditButton = document.getElementById("cancel-edit");
const formTitle = document.getElementById("form-title");
const formSubtitle = document.getElementById("form-subtitle");
const formModePill = document.getElementById("form-mode-pill");
const sportsInput = document.getElementById("sports-input");
const categoryInput = document.getElementById("category-input");
const quantityInput = document.getElementById("quantity-input");
const priceInput = document.getElementById("price-input");
const skuInput = document.getElementById("sku-input");
const locationInput = document.getElementById("location-input");

let products = [];
let deletingIds = new Set();
let submittingProduct = false;
let editingProductId = null;

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function formatCurrency(value) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

function sortProducts(rows) {
	return [...rows].sort((left, right) => left.id - right.id);
}

function setFormMode() {
	const isEditing = editingProductId !== null;

	formTitle.textContent = isEditing ? "Edit Product" : "Add Product";
	formSubtitle.textContent = isEditing
		? "Update the selected warehouse record through the PUT endpoint."
		: "Create a new warehouse record through the existing POST endpoint.";
	formModePill.textContent = isEditing ? `PUT /inventory/${editingProductId}` : "POST /inventory";
	createSubmitButton.textContent = submittingProduct
		? (isEditing ? "Saving..." : "Adding...")
		: (isEditing ? "Save Changes" : "Add Product");
	createSubmitButton.disabled = submittingProduct;
	cancelEditButton.hidden = !isEditing;
	cancelEditButton.disabled = submittingProduct;
}

function resetForm() {
	editingProductId = null;
	createProductForm.reset();
	setFormMode();
	sportsInput.focus();
}

function startEditingProduct(productId) {
	const product = products.find((item) => item.id === productId);

	if (!product) {
		return;
	}

	editingProductId = productId;
	sportsInput.value = product.sports;
	categoryInput.value = product.category;
	quantityInput.value = String(product.quantity);
	priceInput.value = String(product.unit_price);
	skuInput.value = product.sku;
	locationInput.value = product.storage_location ?? "";
	setFormMode();
	window.scrollTo({ top: 0, behavior: "smooth" });
	sportsInput.focus();
}

function renderSummary(rows) {
	const totalUnits = rows.reduce((sum, product) => sum + product.quantity, 0);
	const sports = new Set(rows.map((product) => product.sports));
	const totalValue = rows.reduce((sum, product) => sum + (product.quantity * product.unit_price), 0);

	productCount.textContent = String(rows.length);
	unitCount.textContent = String(totalUnits);
	sportCount.textContent = String(sports.size);
	inventoryValue.textContent = formatCurrency(totalValue);
	recordPill.textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
}

function renderTable(rows) {
	if (rows.length === 0) {
		inventoryBody.innerHTML = "";
		feedback.textContent = products.length === 0
			? "No products were returned by the API."
			: "No products match the current search.";
		feedback.hidden = false;
		renderSummary(rows);
		return;
	}

	const markup = rows.map((product) => `
		<tr>
			<td>${product.id}</td>
			<td>${escapeHtml(product.sports)}</td>
			<td>${escapeHtml(product.category)}</td>
			<td>${product.quantity}</td>
			<td>${formatCurrency(product.unit_price)}</td>
			<td><span class="sku-cell">${escapeHtml(product.sku)}</span></td>
			<td>${escapeHtml(product.storage_location ?? "-")}</td>
			<td>
				<button
					type="button"
					class="edit-button"
					data-product-id="${product.id}"
					${submittingProduct || deletingIds.has(product.id) ? "disabled" : ""}
				>
					Edit
				</button>
				<button
					type="button"
					class="delete-button"
					data-product-id="${product.id}"
					data-product-label="${escapeHtml(product.sku)}"
					${submittingProduct || deletingIds.has(product.id) ? "disabled" : ""}
				>
					${deletingIds.has(product.id) ? "Deleting..." : "Delete"}
				</button>
			</td>
		</tr>
	`).join("");

	inventoryBody.innerHTML = markup;
	feedback.hidden = true;
	renderSummary(rows);
}

function filterProducts(query) {
	const normalizedQuery = query.trim().toLowerCase();

	if (!normalizedQuery) {
		renderTable(products);
		return;
	}

	const filtered = products.filter((product) => {
		const haystack = [
			product.sports,
			product.category,
			product.sku,
			product.storage_location ?? "",
		].join(" ").toLowerCase();

		return haystack.includes(normalizedQuery);
	});

	renderTable(filtered);
}

function getVisibleProducts() {
	const query = searchInput.value.trim().toLowerCase();

	if (!query) {
		return products;
	}

	return products.filter((product) => {
		const haystack = [
			product.sports,
			product.category,
			product.sku,
			product.storage_location ?? "",
		].join(" ").toLowerCase();

		return haystack.includes(query);
	});
}

async function deleteProduct(productId, productLabel) {
	const confirmed = window.confirm(`Delete product ${productLabel}?`);
	let resultMessage = "";

	if (!confirmed) {
		return;
	}

	deletingIds.add(productId);
	renderTable(getVisibleProducts());
	feedback.hidden = false;
	feedback.textContent = `Deleting ${productLabel}...`;

	try {
		const response = await fetch(`/inventory/${productId}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		products = products.filter((product) => product.id !== productId);

		if (editingProductId === productId) {
			resetForm();
		}

		resultMessage = `Deleted ${productLabel}.`;
		connectionStatus.textContent = "Connected";
		lastUpdated.textContent = `Last updated ${new Date().toLocaleString()}`;
	} catch (error) {
		resultMessage = "Could not delete the product.";
		lastUpdated.textContent = error instanceof Error ? error.message : "Unknown error";
	} finally {
		deletingIds.delete(productId);
		renderTable(getVisibleProducts());

		if (resultMessage) {
			feedback.hidden = false;
			feedback.textContent = resultMessage;
		}
	}
}

async function loadInventory() {
	feedback.hidden = false;
	feedback.textContent = "Loading inventory from the API...";
	connectionStatus.textContent = "Loading inventory...";

	try {
		const response = await fetch("/inventory");

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		products = sortProducts(await response.json());
		renderTable(products);
		connectionStatus.textContent = "Connected";
		lastUpdated.textContent = `Last updated ${new Date().toLocaleString()}`;
	} catch (error) {
		inventoryBody.innerHTML = "";
		feedback.hidden = false;
		feedback.textContent = "Could not load inventory from the API.";
		connectionStatus.textContent = "Connection error";
		lastUpdated.textContent = error instanceof Error ? error.message : "Unknown error";
		renderSummary([]);
	}
}

async function submitProductForm(event) {
	event.preventDefault();

	const formData = new FormData(createProductForm);
	const payload = {
		sports: String(formData.get("sports") ?? "").trim(),
		category: String(formData.get("category") ?? "").trim(),
		quantity: Number(formData.get("quantity")),
		unit_price: Number(formData.get("unit_price")),
		sku: String(formData.get("sku") ?? "").trim(),
		storage_location: String(formData.get("storage_location") ?? "").trim() || null,
	};

	submittingProduct = true;
	setFormMode();
	feedback.hidden = false;
	feedback.textContent = editingProductId === null
		? `Adding ${payload.sku || "product"}...`
		: `Updating ${payload.sku || "product"}...`;

	try {
		const response = await fetch(editingProductId === null ? "/inventory" : `/inventory/${editingProductId}`, {
			method: editingProductId === null ? "POST" : "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		const responseBody = await response.json().catch(() => null);

		if (!response.ok) {
			const detail = responseBody && typeof responseBody.detail === "string"
				? responseBody.detail
				: `Request failed with status ${response.status}`;
			throw new Error(detail);
		}

		if (editingProductId === null) {
			products = sortProducts([...products, responseBody]);
			feedback.textContent = `Added ${responseBody.sku}.`;
		} else {
			products = sortProducts(products.map((product) => (
				product.id === editingProductId ? responseBody : product
			)));
			feedback.textContent = `Updated ${responseBody.sku}.`;
		}

		renderTable(getVisibleProducts());
		resetForm();
		feedback.hidden = false;
		connectionStatus.textContent = "Connected";
		lastUpdated.textContent = `Last updated ${new Date().toLocaleString()}`;
	} catch (error) {
		feedback.hidden = false;
		feedback.textContent = error instanceof Error
			? error.message
			: (editingProductId === null ? "Could not create the product." : "Could not update the product.");
		lastUpdated.textContent = error instanceof Error ? error.message : "Unknown error";
	} finally {
		submittingProduct = false;
		setFormMode();
	}
}

searchInput.addEventListener("input", (event) => {
	filterProducts(event.target.value);
});

createProductForm.addEventListener("submit", submitProductForm);
cancelEditButton.addEventListener("click", resetForm);

inventoryBody.addEventListener("click", (event) => {
	const target = event.target;

	if (!(target instanceof HTMLButtonElement)) {
		return;
	}

	const productId = Number(target.dataset.productId);

	if (Number.isNaN(productId)) {
		return;
	}

	if (target.matches(".edit-button")) {
		startEditingProduct(productId);
		return;
	}

	if (!target.matches(".delete-button")) {
		return;
	}

	const productLabel = target.dataset.productLabel ?? `#${productId}`;

	deleteProduct(productId, productLabel);
});

setFormMode();
loadInventory();
