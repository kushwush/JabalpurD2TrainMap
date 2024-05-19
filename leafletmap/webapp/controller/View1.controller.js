sap.ui.define([
	"sap/ui/core/mvc/Controller"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller) {
		"use strict";
		return Controller.extend("com.jec.leafletmap.controller.View1", {
			onInit: function () {
				// Create a JSON Model for the status of the moving marker
				let oModel = new sap.ui.model.json.JSONModel();
				// Set the initial status of the moving marker
				let status = {
					reversed: false,
					isMoving: false,
					enabled: true,
				}
				oModel.setData(status);
				// Set the model to the view
				this.getView().setModel(oModel, "status");
			},
			onAfterRendering: function () {
				// Add the map to the view
				this.addMap();
				// Setup the tile layer for the map
				this.setupTileLayer();
				// Add the train path to the map
				this.addTrainPath();
				// // Setup the moving marker
				// this.setupMovingMarker();
				// add button to map
				this.setupButton();
			},
			addMap: function () {
				// Get the DOM element id of the map panel
				let idMapPanel = this.getView().byId("idMapPanel");
				// Create a Leaflet map and set the initial view
				this.map = L.map(idMapPanel.getId(), {
					center: [27.666241, 77.47595],
					zoom: 7,
					maxZoom: 10,
					minZoom: 4,
					zoomControl: false,
					fadeAnimation: true,
					zoomAnimation: true
				});
				this.fitBoundsOptions = {
					animate: true,
					duration: 5
				};
				// India Map Bounds
				this.map.fitBounds([
					[28.64089055942614, 77.1865226730381],
					[13.141489135044651, 77.642296107849],
					[23.59046433592819, 68.54292511955069],
					[28.370902624688895, 97.319481781109],
				], this.fitBoundsOptions);
			},
			setupTileLayer: function () {
				// Create a tile layer using Stadia Maps
				L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.{ext}', {
					minZoom: 0,
					maxZoom: 20,
					attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
					ext: 'png'
				}).addTo(this.map);
			},
			addTrainPath: function () {
				// Get the Model for the Train Path
				let trainPathModel = this.getOwnerComponent().getModel("trainPath");
				// Get the Train Path Data
				let trainPathData = trainPathModel.getData();
				// Add the geoJSON train path to the map
				L.geoJSON(trainPathData).addTo(this.map);
				// capture coordinates for moving marker
				this.coordinates = trainPathData.features[0].geometry.coordinates;
			},

			setupMovingMarker: function () {
				// Clear the layer with the previous marker (if any)
				if (this.movingMarkerLayer) {
					this.movingMarkerLayer.clearLayers();
				}
				// Create a layer group for the moving marker
				if (!this.movingMarkerLayer) {
				this.movingMarkerLayer = L.layerGroup().addTo(this.map);
				}
				// Create Custom Icon for Train
				let trainIcon = L.icon({
					iconUrl: `${$.sap.getModulePath("com.jec.leafletmap")}/images/Train-icon.png`,
					iconSize: [24, 24],
					iconAnchor: [12, 12]
				});

				this.playMovingMarker(trainIcon);
			},

			playMovingMarker: function (trainIcon) {
				// Set the status of the moving marker
				this.getView().getModel("status").setProperty("/isMoving", true);
				// Disable the button
				this.getView().getModel("status").setProperty("/enabled", false);
				// Get the status of the moving marker
				let status = this.getView().getModel("status").getData();
				// Set the bounds of the map to the train path
				let startBound = this.coordinates[0]; // First coordinate of the path
				let endBound = this.coordinates[this.coordinates.length - 1]; // Last coordinate of the path
				// Set the bounds of the map to the train path
				let trainBounds = [
					[startBound[1], startBound[0]],
					[endBound[1], endBound[0]]
				];
				// Fit the map to the train path
				setTimeout(() => {
					this.map.fitBounds(trainBounds, this.fitBoundsOptions);
				}, 500);
				// clone the coordinates array for easy reversal
				let pathCoordinates = structuredClone(this.coordinates);
				// reverse the path if needed
				if (status.reversed) {
					pathCoordinates.reverse();
				}
				// Move the marker along the train path
				pathCoordinates.forEach((coords, index) => {
					setTimeout(() => {
						// Clear the layer with the previous marker (if any) and add the new marker
						this.movingMarkerLayer.clearLayers();
						L.marker([coords[1], coords[0]], { icon: trainIcon }).addTo(this.movingMarkerLayer);
						// Pan the map to the new marker
						this.map.panTo([coords[1], coords[0]]);
						sap.m.MessageToast.show(`Status: ${status.reversed ? "Reversed" : "Normal"} - Index: ${index} - Coordinates: ${parseFloat(coords[1]).toFixed(3)}, ${parseFloat(coords[0]).toFixed(3)}`, {
							duration: 25,
							animationDuration: 1,
							width: "50em",
						}
						);
					}, 25 * index);
					// Set the status of the moving marker to false when the marker reaches the end of the path
					if (index === this.coordinates.length - 1) {
						setTimeout(() => {
							// Set the status of the moving marker
							this.getView().getModel("status").setProperty("/isMoving", false);
							// Enable the button
							this.getView().getModel("status").setProperty("/enabled", true); 
							// Reverse the path
							this.getView().getModel("status").setProperty("/reversed", !status.reversed);
						}, 25 * index);
					}
				});
			},

			setupButton: function () {
				// Create a sap.m.Button to play the moving marker
				let oButton = new sap.m.Button({
					text: "Play",
					press: this.setupMovingMarker.bind(this),
					enabled: "{status>/enabled}"
				});
				// Set the model to the button
				oButton.setModel(this.getView().getModel("status"), "status");
				// Initialize a topright legend control, and get it's reference to topRightLegend
				let topRightLegend = L.control({ position: 'topright' });
				// Define the onAdd method for the topRightLegend control
				topRightLegend.onAdd = function (_map) {
					// Create a div element
					let div = L.DomUtil.create('div');
					return div;
				};
				// Add the topRightLegend control to the map
				topRightLegend.addTo(this.map);
				// Place the button in the topRightLegend control
				// now the button will show up on the top right corner of the map
				oButton.placeAt(topRightLegend.getContainer());
			}
		});
	});
