"use strict";

import { drawText } from "https://cdn.jsdelivr.net/npm/canvas-txt@4.1.1/+esm";
import { printCanvas } from "./src/printer.js";

const $ = document.querySelector.bind(document);
const $all = document.querySelectorAll.bind(document);

const labelSize = { width: 40, height: 12 };

const updateLabelSize = (canvas) => {
	const inputWidth = $("#inputWidth").valueAsNumber;
	const inputHeight = $("#inputHeight").valueAsNumber;
	if (isNaN(inputWidth) || isNaN(inputHeight)) {
		handleError("label size invalid");
		return;
	}

	labelSize.width = inputWidth;
	labelSize.height = inputHeight;

	// Image sent to printer is printed top to bottom, so reverse width and height
	canvas.width = labelSize.height * 8;
	canvas.height = labelSize.width * 8;
};

const updateCanvasText = (canvas) => {
	const text = $("#inputText").value;
	const fontSize = $("#inputFontSize").valueAsNumber;
	if (isNaN(fontSize)) {
		handleError("font size invalid");
		return;
	}

	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.rotate(Math.PI / 2);

	ctx.fillStyle = "#000";
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	drawText(ctx, text, {
		x: -canvas.height / 2,
		y: -canvas.width / 2,
		width: canvas.height,
		height: canvas.width,
		font: "sans-serif",
		fontSize,
	});

	ctx.rotate(-Math.PI / 2);
	ctx.translate(-canvas.width / 2, -canvas.height / 2);
};

const updateCanvasBarcode = (canvas) => {
	const barcodeData = $("#inputBarcode").value;
	const image = document.createElement("img");
	image.addEventListener("load", () => {
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(image, -image.width / 2, -image.height / 2);

		ctx.rotate(-Math.PI / 2);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);
	});

	JsBarcode(image, barcodeData, {
		format: "CODE128",
		width: 2,
		height: labelSize.height * 7,
		displayValue: false,
	});
};

const drawImageToCanvas = (ctx, url, doScale = true) => {
	const img = new Image();
	img.addEventListener("load", () => {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;
		// draw image in center of canvas, scaled to fit
		const scale = doScale ? Math.min(canvas.height / img.width, canvas.width / img.height) : 1;
		const drawWidth = img.width * scale;
		const drawHeight = img.height * scale;
		ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

		ctx.rotate(-Math.PI / 2);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);
	});
	img.addEventListener("error", () => {
		handleError("failed to load image");
	});

	img.src = url;
};

const updateCanvasImage = (canvas) => {
	const ctx = canvas.getContext("2d");
	const file = $("#inputImage").files[0];
	if (!file) {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		return;
	}

	const reader = new FileReader();
	reader.addEventListener("load", (e) => {
		drawImageToCanvas(ctx, e.target.result);
	});
	reader.addEventListener("error", () => {
		handleError("failed to read image file");
	});

	reader.readAsDataURL(file);
};

const updateCanvasQR = async (canvas) => {
	const data = $("#inputQR").value;
	const ctx = canvas.getContext("2d");
	const qrImg = await QRCode.toDataURL(data, { width: canvas.width - 8, margin: 2 });
	drawImageToCanvas(ctx, qrImg, false);
};

const updateCanvasQRText = async (canvas) => {
	const data = $("#inputQRTextData").value;
	const text = $("#inputQRText").value;
	const fontSizeInput = $("#inputQRTextSize").valueAsNumber;
	const ctx = canvas.getContext("2d");
	const labelWidth = canvas.height;
	const labelHeight = canvas.width;
	const padding = 4;
	const gap = 6;
	const left = -labelWidth / 2 + padding;
	const top = -labelHeight / 2 + padding;
	const right = labelWidth / 2 - padding;
	const bottom = labelHeight / 2 - padding;
	const fallbackFontSize = Math.floor(labelHeight * 0.4);
	const fontSize = isNaN(fontSizeInput)
		? Math.max(10, Math.min(48, fallbackFontSize))
		: Math.max(1, fontSizeInput);

	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const maxQrSize = Math.max(16, Math.min(labelHeight - padding * 2, labelWidth - padding * 2));
	let qrSize = maxQrSize;
	if (text.trim()) {
		const minTextWidth = 32;
		const availableForQr = right - left - gap - minTextWidth;
		qrSize = Math.max(16, Math.min(maxQrSize, availableForQr));
	}
	const qrImg = await QRCode.toDataURL(data, { width: qrSize, margin: 1 });
	const image = new Image();
	image.addEventListener("load", () => {
		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;
		if (!text.trim()) {
			const drawX = -labelWidth / 2 + (labelWidth - qrSize) / 2;
			const drawY = -labelHeight / 2 + (labelHeight - qrSize) / 2;
			ctx.drawImage(image, drawX, drawY, qrSize, qrSize);
		} else {
			const qrX = left;
			const qrY = top;
			ctx.drawImage(image, qrX, qrY, qrSize, qrSize);

			ctx.fillStyle = "#000";
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			const textX = qrX + qrSize + gap;
			const textY = top;
			const textWidth = Math.max(0, right - textX);
			const textHeight = Math.max(0, bottom - top);
			if (textWidth > 0 && textHeight > 0) {
				drawText(ctx, text, {
					x: textX,
					y: textY,
					width: textWidth,
					height: textHeight,
					font: "sans-serif",
					fontSize,
				});
			}
		}

		ctx.rotate(-Math.PI / 2);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);
	});
	image.addEventListener("error", () => {
		handleError("failed to load QR code");
	});
	image.src = qrImg;
};

const handleError = (err) => {
	console.error(err);

	const toast = bootstrap.Toast.getOrCreateInstance($("#errorToast"));
	$("#errorText").textContent = err.toString();
	toast.show();
};

document.addEventListener("DOMContentLoaded", function () {
	const canvas = document.querySelector("#canvas");

	document.addEventListener("shown.bs.tab", (e) => {
		if (e.target.id === "nav-text-tab") updateCanvasText(canvas);
		else if (e.target.id === "nav-barcode-tab") updateCanvasBarcode(canvas);
		else if (e.target.id === "nav-image-tab") updateCanvasImage(canvas);
		else if (e.target.id === "nav-qr-tab") updateCanvasQR(canvas);
		else if (e.target.id === "nav-qr-text-tab") updateCanvasQRText(canvas);
	});

	$all("#inputWidth, #inputHeight").forEach((e) =>
		e.addEventListener("input", () => updateLabelSize(canvas))
	);
	updateLabelSize(canvas);

	$all("#inputText, #inputFontSize").forEach((e) =>
		e.addEventListener("input", () => updateCanvasText(canvas))
	);
	updateCanvasText(canvas);

	$("#inputBarcode").addEventListener("input", () => updateCanvasBarcode(canvas));
	$("#inputImage").addEventListener("change", () => updateCanvasImage(canvas));
	$("#inputQR").addEventListener("input", () => updateCanvasQR(canvas));
	$all("#inputQRTextData, #inputQRText, #inputQRTextSize").forEach((e) =>
		e.addEventListener("input", () => updateCanvasQRText(canvas))
	);

	$("form").addEventListener("submit", (e) => {
		e.preventDefault();
		navigator.bluetooth
			.requestDevice({
				acceptAllDevices: true,
				optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"],
			})
			.then((device) => device.gatt.connect())
			.then((server) => server.getPrimaryService("0000ff00-0000-1000-8000-00805f9b34fb"))
			.then((service) => service.getCharacteristic("0000ff02-0000-1000-8000-00805f9b34fb"))
			.then((char) => printCanvas(char, canvas))
			.catch(handleError);
	});
});
