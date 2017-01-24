var NDVILegendView = function () {
    inheritance.base(this, new Legend({
        'name': "Цветовая шкала NDVI",
        'width': 400,
        'height': 220
    }));

    this.initialize();
};

inheritance.extend(NDVILegendView, LegendView);