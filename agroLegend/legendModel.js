var Legend = function (options) {
    this.name = options.name || "";
    this._palette = [];
    this.width = options.width || 480;
    this.height = options.height || 220;
};

Legend.RGBToString = function (r, g, b) {
    var d = r + 256 * g + 65536 * b;
    return d.toString(16);
};

Legend.toHex = function (c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
};

Legend.RGBToHex = function (r, g, b) {
    return "#" + Legend.toHex(r) + Legend.toHex(g) + Legend.toHex(b);
};
