var LayersTool = function (caption, layersArr) {
    var layersArr = layersArr || [];

    var lmap = nsGmx.leafletMap;
    var gmxLayers = lmap.gmxControlsManager.get('layers');
    var layerGroup = new L.layerGroup();

    for (var i = 0; i < layersArr.length; i++) {
        layerGroup.addLayer(layersArr[i]);
    }

    gmxLayers.addOverlay(layerGroup, caption);
};